from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from bson import ObjectId
from datetime import datetime
import os
import PyPDF2
import docx
import json
import re 
from groq import Groq
import pandas as pd
from rec_courses import recommend_course
import certifi
from dotenv import load_dotenv
from pymongo.errors import InvalidURI

app = Flask(__name__)
CORS(app)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
mongodb_uri = os.getenv('MONGODB_URI') or os.getenv('connec_string')
mongodb_db_name = os.getenv('MONGODB_DB') or 'UserTest'
mongodb_auth_source = os.getenv('MONGODB_AUTH_SOURCE')
groq_api = os.getenv('groq_api')

if not mongodb_uri:
    raise RuntimeError(
        "Missing MongoDB connection string. Set MONGODB_URI (recommended) or connec_string in backend/.env."
    )

mongodb_uri = mongodb_uri.strip()

def _validate_mongodb_uri(value: str) -> None:
    if value.count("mongodb://") + value.count("mongodb+srv://") > 1:
        raise RuntimeError(
            "MONGODB_URI looks like multiple URIs got concatenated. "
            "Ensure backend/.env contains exactly one MongoDB URI on a single line."
        )

    scheme_end = value.find("://")
    if scheme_end != -1:
        after_scheme = value[scheme_end + 3 :]
        authority = after_scheme.split("/", 1)[0]
        if authority.count("@") > 1:
            raise RuntimeError(
                "MONGODB_URI contains multiple '@' before the host. "
                "This usually means your password contains '@' (or another reserved character) and must be URL-encoded "
                "(e.g. '@' -> '%40')."
            )

mongo_client_kwargs = {
    # Fix: SSL/TLS handshake failures on Windows with MongoDB Atlas
    # (common when the system OpenSSL version doesn't support the TLS variant used by Atlas)
    "tlsAllowInvalidCertificates": True,
    "tlsCAFile": certifi.where(),
}
if mongodb_auth_source:
    mongo_client_kwargs["authSource"] = mongodb_auth_source

# Pre-initialise so routes don't crash with NameError if the DB is unreachable
db = None
users_collection = None

# Connect to MongoDB
_validate_mongodb_uri(mongodb_uri)
try:
    client = MongoClient(mongodb_uri, **mongo_client_kwargs)
except InvalidURI as e:
    raise RuntimeError(
        "Invalid MONGODB_URI format. Ensure the query string (after '?') contains only key=value pairs joined by '&'. "
        "Also URL-encode special characters in the password (e.g. '@' -> '%40')."
    ) from e

try:
    client.admin.command('ping')
    print("MongoDB is connected")
    print(f"Available databases: {client.list_database_names()}")
    db = client[mongodb_db_name]
    users_collection = db['users']
    print(f"Selected database: {db.name}")
    print(f"Selected collection: {users_collection.name}")
    print(f"Document count in collection: {users_collection.count_documents({})}")
except Exception as e:
    print("MongoDB connection failed:", e)
    print("Auth endpoints will return 503 until the database is reachable.")


def _require_db():
    """Return a Flask error response (503) when users_collection is unavailable, else None."""
    if users_collection is None:
        return jsonify({'message': 'Database is unavailable. Please try again later.'}), 503
    return None

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Configure Groq API
groq_client = Groq(
    api_key=groq_api,
)
groq_model = os.getenv("GROQ_MODEL") or "llama-3.1-8b-instant"

@app.route('/api/signup', methods=['POST'])
def signup():
    db_err = _require_db()
    if db_err: return db_err

    print("Received signup request")
    if not request.is_json:
        print("Request is not JSON")
        return jsonify({'message': 'Request must be JSON'}), 400
    
    data = request.get_json(silent=True) or {}
    print(f"Received data: {data}")
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    
    if not name or not email or not password:
        print(f"Missing name, email or password. Name: {name}, Email: {email}, Password: {'*' * len(password) if password else None}")
        return jsonify({'message': 'Name, email, and password are required'}), 400

    existing_user = users_collection.find_one({'email': email})
    if existing_user:
        return jsonify({'message': 'An account with this email already exists'}), 409

    hashed_password = generate_password_hash(password)
    try:
        user_data = {
            'name': name,
            'email': email,
            'password': hashed_password,
            'job': '',
            'skills': [],
            'skills_to_improve': [],
            'tagline': 'A catchy tagline!'
        }
        result = users_collection.insert_one(user_data)
        print(f"Insertion result: {result.inserted_id}")
        return jsonify({'message': 'Signup successful'}), 201
    except Exception as e:
        print(f"Error inserting user: {e}")
        return jsonify({'message': 'Error creating user'}), 500

@app.route('/api/login', methods=['POST'])
def login():
    db_err = _require_db()
    if db_err: return db_err

    if not request.is_json:
        return jsonify({'message': 'Request must be JSON'}), 400

    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    
    if not email or not password:
        return jsonify({'message': 'Email and password are required'}), 400
    
    user = users_collection.find_one({'email': email})
    stored_hash = (user or {}).get('password')
    try:
        password_ok = bool(user) and bool(stored_hash) and check_password_hash(stored_hash, password)
    except (ValueError, TypeError):
        password_ok = False

    if password_ok:
        user_data = {
            'name': user['name'],
            'email': user['email'],
            'tagline': user.get('tagline', 'A catchy tagline!') 
        }
        return jsonify({'message': 'Login successful', 'user': user_data}), 200
    else:
        return jsonify({'message': 'Invalid email or password'}), 401
    
@app.route('/api/skills', methods=['GET'])
def get_skills():
    db_err = _require_db()
    if db_err: return db_err

    email = request.args.get('email')
    if not email:
        return jsonify({'message': 'Email is required'}), 400
    
    user = users_collection.find_one({'email': email})
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    skills = user.get('skills', [])
    return jsonify({'skills': skills}), 200

@app.route('/api/skills', methods=['POST'])
def add_skill():
    db_err = _require_db()
    if db_err: return db_err

    data = request.get_json()
    email = data.get('email')
    new_skill = data.get('skill')
    
    if not email or not new_skill:
        return jsonify({'message': 'Email and skill are required'}), 400
    
    user = users_collection.find_one({'email': email})
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    current_date = datetime.now().strftime('%B %Y')
    skill_object = {
        'date': current_date,
        'title': new_skill
    }
    
    result = users_collection.update_one(
        {'email': email},
        {'$push': {'skills': skill_object}}
    )
    
    if result.modified_count:
        return jsonify({'message': 'Skill added successfully', 'skill': skill_object}), 201
    else:
        return jsonify({'message': 'Failed to add skill'}), 500
        
@app.route('/api/user/job', methods=['GET'])
def get_job():
    db_err = _require_db()
    if db_err: return db_err

    email = request.args.get('email')
    if not email:
        return jsonify({'message': 'Email is required'}), 400
    
    user = users_collection.find_one({'email': email})
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    job = user.get('job', '')
    if job == '':
        job = 'Developer'  # Set default job
    
    return jsonify({'job': job}), 200

@app.route('/api/user/job', methods=['POST'])
def update_job():
    db_err = _require_db()
    if db_err: return db_err

    data = request.get_json()
    email = data.get('email')
    new_job = data.get('job')
    
    if not email or new_job is None:
        return jsonify({'message': 'Email and job are required'}), 400
    
    result = users_collection.update_one(
        {'email': email},
        {'$set': {'job': new_job}}
    )
    
    if result.modified_count:
        return jsonify({'message': 'Job updated successfully'}), 200
    else:
        return jsonify({'message': 'Failed to update job'}), 500
    
@app.route('/api/user/update', methods=['PUT'])
def update_user():
    db_err = _require_db()
    if db_err: return db_err

    data = request.get_json()
    email = data.get('email')
    field = data.get('field')
    new_value = data.get('value')
    
    if not email or not field or new_value is None:
        return jsonify({'message': 'Email, field, and new value are required'}), 400
    
    if field not in ['name', 'password']:
        return jsonify({'message': 'Only name and password can be updated'}), 400

    update_data = {}
    
    if field == 'password':
        update_data[field] = generate_password_hash(new_value)
    else:  # field is 'name'
        update_data[field] = new_value
    
    result = users_collection.update_one(
        {'email': email},
        {'$set': update_data}
    )
    
    if result.modified_count:
        return jsonify({'message': f'{field.capitalize()} updated successfully'}), 200
    else:
        return jsonify({'message': f'Failed to update {field}'}), 500

@app.route('/api/user/tagline', methods=['GET'])
def get_tagline():
    db_err = _require_db()
    if db_err: return db_err

    email = request.args.get('email')
    if not email:
        return jsonify({'message': 'Email is required'}), 400
    
    user = users_collection.find_one({'email': email})
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    tagline = user.get('tagline', 'A catchy tagline!')
    
    return jsonify({'tagline': tagline}), 200

@app.route('/api/user/tagline', methods=['POST'])
def update_tagline():
    db_err = _require_db()
    if db_err: return db_err

    data = request.get_json()
    email = data.get('email')
    new_tagline = data.get('tagline')
    
    if not email or new_tagline is None:
        return jsonify({'message': 'Email and tagline are required'}), 400
    
    result = users_collection.update_one(
        {'email': email},
        {'$set': {'tagline': new_tagline}}
    )
    
    if result.modified_count:
        return jsonify({'message': 'Tagline updated successfully'}), 200
    else:
        return jsonify({'message': 'Failed to update tagline'}), 500

@app.route('/skill-analyzer', methods=['POST'])
def skill_analyzer():
    if 'resume' not in request.files or 'job_description' not in request.files:
        return jsonify({'error': 'Both resume and job description files are required'}), 400
    
    resume_file = request.files['resume']
    job_description_file = request.files['job_description']
        
    resume_filename = secure_filename(resume_file.filename)
    job_filename = secure_filename(job_description_file.filename)
        
    resume_path = os.path.join(app.config['UPLOAD_FOLDER'], resume_filename)
    job_path = os.path.join(app.config['UPLOAD_FOLDER'], job_filename)
        
    resume_file.save(resume_path)
    job_description_file.save(job_path)
        
    try:
        resume_text = extract_text(resume_path)
        job_text = extract_text(job_path)
        
        skills_analysis = compare_skills(resume_text, job_text)
        if isinstance(skills_analysis, dict) and 'error' not in skills_analysis:
            skills_analysis['skill_gap_trace'] = build_skill_gap_trace(skills_analysis, resume_text, job_text)
            
        os.remove(resume_path)
        os.remove(job_path)
            
        if 'error' in skills_analysis:
            return jsonify(skills_analysis), 500
            
        return jsonify(skills_analysis)
    except Exception as e:
        if os.path.exists(resume_path):
            os.remove(resume_path)
        if os.path.exists(job_path):
            os.remove(job_path)
        print(f"Error in skill analysis: {str(e)}")
        return jsonify({'error': f'An error occurred during skill analysis: {str(e)}'}), 500

def extract_text(file_path):
    _, file_extension = os.path.splitext(file_path)
    
    if file_extension.lower() == '.pdf':
        with open(file_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ''
            for page in reader.pages:
                text += page.extract_text()
    elif file_extension.lower() in ['.docx', '.doc']:
        doc = docx.Document(file_path)
        text = '\n'.join([paragraph.text for paragraph in doc.paragraphs])
    else:
        with open(file_path, 'r') as file:
            text = file.read()
    
    return text

def normalize_skill(skill):
    return re.sub(r'[^\w\s]', '', skill.lower())

def tokenize(text):
    return re.findall(r'\b\w+\b', normalize_skill(text))

def jaccard_similarity(set1, set2):
    intersection = len(set1.intersection(set2))
    union = len(set1.union(set2))
    return intersection / union if union != 0 else 0

def _split_into_phrases(text: str):
    """
    Split job description text into short "phrases" (lines/sentences) we can cite as evidence.
    We keep the original phrasing so the UI can show the exact JD snippet that triggered a gap.
    """
    if not text:
        return []

    chunks = []
    for raw_line in re.split(r'[\r\n]+', text):
        line = raw_line.strip()
        if not line:
            continue

        # Preserve bullet-like lines; otherwise, split into sentences.
        if re.match(r'^[-•\u2022]\s+', line):
            chunks.append(line)
            continue

        sentences = re.split(r'(?<=[.!?])\s+', line)
        for sentence in sentences:
            s = sentence.strip()
            if s:
                chunks.append(s)

    # De-dup while preserving order
    seen = set()
    phrases = []
    for chunk in chunks:
        key = normalize_skill(chunk)
        if key and key not in seen:
            seen.add(key)
            phrases.append(chunk)
    return phrases

def _best_jd_phrase_for_skill(job_phrases, skill: str):
    skill = (skill or "").strip()
    if not skill:
        return {"jd_phrase": "", "match_type": "inferred", "score": 0.0}

    skill_norm = normalize_skill(skill)
    skill_tokens = set(tokenize(skill))
    if not job_phrases:
        return {"jd_phrase": "", "match_type": "inferred", "score": 0.0}

    best_phrase = ""
    best_score = -1.0

    for phrase in job_phrases:
        phrase_norm = normalize_skill(phrase)

        # Strong signal: the skill appears verbatim (after normalization).
        if skill_norm and phrase_norm and skill_norm in phrase_norm:
            return {"jd_phrase": phrase, "match_type": "direct", "score": 1.0}

        phrase_tokens = set(tokenize(phrase))
        if not phrase_tokens or not skill_tokens:
            continue

        overlap = len(skill_tokens.intersection(phrase_tokens)) / max(len(skill_tokens), 1)
        jac = jaccard_similarity(skill_tokens, phrase_tokens)
        score = max(overlap, jac)

        if score > best_score:
            best_score = score
            best_phrase = phrase

    if not best_phrase:
        return {"jd_phrase": "", "match_type": "inferred", "score": 0.0}

    if best_score >= 0.35:
        match_type = "fuzzy"
    elif best_score >= 0.15:
        match_type = "weak"
    else:
        match_type = "inferred"

    return {
        "jd_phrase": best_phrase,
        "match_type": match_type,
        "score": float(round(max(best_score, 0.0), 3)) if best_score >= 0 else 0.0,
    }

def build_skill_gap_trace(skills_data, resume_text: str, job_text: str):
    job_phrases = _split_into_phrases(job_text or "")
    resume_skills = skills_data.get("skills_from_resume") or []
    gaps = skills_data.get("skills_to_improve") or []

    items = []
    for idx, skill in enumerate(gaps, start=1):
        evidence = _best_jd_phrase_for_skill(job_phrases, skill)
        items.append({
            "step": idx,
            "skill": skill,
            "jd_phrase": evidence["jd_phrase"],
            "match_type": evidence["match_type"],
            "score": evidence["score"],
            "reason": "Present in job description but not detected in resume.",
        })

    return {
        "version": "1.0",
        "gap_count": len(gaps),
        "items": items,
    }

def is_skill_match(resume_skills, job_skill, threshold=0.3):
    job_tokens = set(tokenize(job_skill))
    resume_tokens = set(token for skill in resume_skills for token in tokenize(skill))
    
    if "or" in job_skill.lower():
        return any(skill.lower() in normalize_skill(job_skill) for skill in resume_skills)
    
    for resume_skill in resume_skills:
        if set(tokenize(resume_skill)).issubset(job_tokens) or set(job_tokens).issubset(tokenize(resume_skill)):
            return True
    
    if "object-oriented" in job_skill.lower() and any("oop" in normalize_skill(skill) for skill in resume_skills):
        return True
    
    similarity = jaccard_similarity(job_tokens, resume_tokens)
    return similarity >= threshold
    
def compare_skills(resume_text, job_text):
    prompt = rf"""
    Resume:
    {resume_text}

    Job Description:
    {job_text}

    Based on the resume and job description provided, please:
    1. List skills mentioned in the resume As "skills_from_resume". ADD WITHOUT SUBHEADINGS.
    2. List the skills required in the job description in "skills_required_in_job", PLEASE AVOID WIDE AND GENERIC SKILLS AND ONLY MENTION DEFINITE SKILLS THAT CAN BE LEARNED THROUGH A UDEMY COURSE.
    If only key responsibilities\duties are mentioned, then extract the required skills from that.
    Otherwise, extract it from eligibility criteria, qualifications, or any other section that mentions the required skills.
    3. Compare the skills from the resume with the skills required in the job description and list the matching skills. in "matching_skills".
    4. List the skills from the job description that are not present in the resume As "skills_to_improve".
    Present the results in a structured JSON format.
    """

    response = None
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model=groq_model,
            temperature=0,
        )
        response = chat_completion.choices[0].message.content
        
        # Print the raw response for debugging
        print("Raw API response:", response)
        
        # Try to find and extract the JSON part of the response
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            skills_data = json.loads(json_str)
        else:
            raise ValueError("No JSON object found in the response")

        required_keys = ["skills_from_resume", "skills_required_in_job", "matching_skills", "skills_to_improve"]
        if all(key in skills_data for key in required_keys):
            return skills_data
        else:
            missing_keys = [key for key in required_keys if key not in skills_data]
            raise ValueError(f"Missing required keys in JSON: {', '.join(missing_keys)}")

    except json.JSONDecodeError as e:
        print(f"JSON Decode Error: {str(e)}")
        if response is not None:
            print("Response causing the error:", response)
        return {"error": f"Invalid JSON in API response: {str(e)}"}
    except Exception as e:
        print(f"Error in skill analysis: {str(e)}")
        if response is not None:
            print("Response causing the error:", response)
        return {"error": f"Error in skill analysis: {str(e)}"}

@app.route('/generate-quiz', methods=['POST'])
def generate_quiz():
    if 'job_description' not in request.files:
        return jsonify({'error': 'Job description file is required'}), 400

    jd_file = request.files['job_description']
    jd_filename = secure_filename(jd_file.filename)
    jd_path = os.path.join(app.config['UPLOAD_FOLDER'], jd_filename)
    jd_file.save(jd_path)

    try:
        job_text = extract_text(jd_path)
        os.remove(jd_path)
    except Exception as e:
        if os.path.exists(jd_path):
            os.remove(jd_path)
        return jsonify({'error': f'Failed to read job description: {str(e)}'}), 500

    prompt = rf"""
You are an expert technical interviewer. Given the following job description, generate a diagnostic quiz
that tests each identified skill with 2 to 3 separate questions — so the final quiz has between 15 and 20 questions total.

Rules:
- Identify the 6-8 most important skills from the job description.
- For each skill, generate 2-3 distinct questions that test DIFFERENT aspects or difficulty levels of that skill.
- Every question MUST have exactly 4 answer options.
- correct_index is 0-based (0=A, 1=B, 2=C, 3=D).
- difficulty must be "Easy", "Medium", or "Hard" — vary difficulty across the 2-3 questions for each skill.
- skill should be a concise, consistent label (e.g. "Python", "SQL", "React") — use the EXACT SAME label for all questions testing the same skill.
- The questions should be practical, specific, and unambiguous.
- Do NOT repeat questions; each question for the same skill must test a different concept or depth.
- Return ONLY a valid JSON array. No markdown, no explanation, just the array.

Job Description:
{job_text}

Return format (JSON array only):
[
  {{
    "skill": "SkillName",
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_index": 0,
    "difficulty": "Easy"
  }}
]
"""

    response_text = None
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=groq_model,
            temperature=0.3,
        )
        response_text = chat_completion.choices[0].message.content
        print("Quiz generation raw response:", response_text[:500])

        # Extract JSON array from response
        json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
        if not json_match:
            raise ValueError("No JSON array found in model response")

        questions = json.loads(json_match.group(0))

        # Validate structure
        validated = []
        for q in questions:
            if (
                isinstance(q, dict)
                and 'skill' in q
                and 'question' in q
                and 'options' in q
                and isinstance(q['options'], list)
                and len(q['options']) == 4
                and 'correct_index' in q
                and isinstance(q['correct_index'], int)
                and 0 <= q['correct_index'] <= 3
                and 'difficulty' in q
            ):
                validated.append(q)

        if len(validated) < 8:
            raise ValueError(f"Too few valid questions generated: {len(validated)}")

        return jsonify({'questions': validated})

    except json.JSONDecodeError as e:
        print(f"Quiz JSON decode error: {e}")
        if response_text:
            print("Raw response:", response_text)
        return jsonify({'error': f'Invalid JSON from AI: {str(e)}'}), 500
    except Exception as e:
        print(f"Quiz generation error: {e}")
        if response_text:
            print("Raw response:", response_text)
        return jsonify({'error': f'Quiz generation failed: {str(e)}'}), 500


@app.route('/recommend_course', methods=['POST'])
def recommend_course_api():
    data = request.get_json(silent=True) or {}
    skill_name = data.get('resource')
    if not skill_name:
        return jsonify({'error': 'Skill name is required'}), 400
    
    recommended_link = recommend_course(skill_name)
    
    # Check if recommended_link is a pandas Series
    if isinstance(recommended_link, pd.Series):
        if recommended_link.empty:
            return jsonify({'error': 'No recommendation found'}), 404
        # Assuming the first item is the link
        recommended_link = recommended_link.iloc[0]
    elif not recommended_link:
        return jsonify({'error': 'No recommendation found'}), 404
    
    return jsonify({'recommendation': recommended_link})

if __name__ == '__main__':
    port = int(os.getenv('PORT', '5000'))
    debug = os.getenv('FLASK_DEBUG', '1') == '1'
    app.run(host='0.0.0.0', port=port, debug=debug)
