from flask import Flask, render_template, request, redirect, url_for, session
import requests
import os
from urllib.parse import urlparse

app = Flask(__name__, template_folder='templates', static_folder='static')
app.secret_key = 'devsecret'

# ==================================================
# GLOBAL API BASE (Single Source of Truth)
# ==================================================

def get_api_base():
    if os.environ.get("API_BASE"):
        return os.environ.get("API_BASE").rstrip("/")

    parsed = urlparse(request.host_url)
    host = parsed.hostname
    return f"http://{host}:4000/api"


# ==================================================
# ERP PAGE
# ==================================================

@app.route('/')
def erp_page():
    return render_template('erp.html')


@app.route('/home')
def index():
    return render_template('base.html', api_base=get_api_base())


# ==================================================
# TEACHER AUTH
# ==================================================

@app.route('/teacher/login', methods=['GET', 'POST'])
def teacher_login():
    API_BASE = get_api_base()

    if request.method == 'POST':
        resp = requests.post(
            f'{API_BASE}/auth/login',
            json={
                'email': request.form['email'],
                'password': request.form['password']
            }
        )

        if resp.status_code == 200:
            data = resp.json()
            session['teacher_token'] = data['token']
            session['teacher_name'] = data.get('name', 'Teacher')
            return redirect(url_for('teacher_dashboard'))

        return render_template('auth/login.html', role='teacher', error='Invalid credentials')

    return render_template('auth/login.html', role='teacher')

# ==================================================
# TEACHER SIGNUP
# ==================================================

@app.route('/teacher/signup', methods=['GET', 'POST'])
def teacher_signup():

    API_BASE = get_api_base()

    if request.method == 'POST':

        try:
            resp = requests.post(
                f'{API_BASE}/teacher/register',
                json={
                    'name': request.form['name'],
                    'email': request.form['email'],
                    'password': request.form['password']
                },
                timeout=5
            )

            if resp.status_code == 200:
                return redirect(url_for('teacher_login'))

            return render_template(
                'teacher/signup.html',
                role='teacher',
                error='Email already exists'
            )

        except Exception:
            return render_template(
                'teacher/signup.html',
                role='teacher',
                error='Backend not reachable'
            )

    return render_template('teacher/signup.html', role='teacher')


@app.route('/teacher/dashboard')
def teacher_dashboard():
    if 'teacher_token' not in session:
        return redirect(url_for('teacher_login'))

    API_BASE = get_api_base()
    token = session['teacher_token']

    resp = requests.get(
        f"{API_BASE}/courseinstances",
        headers={"Authorization": f"Bearer {token}"}
    )

    courses = resp.json() if resp.status_code == 200 else []

    return render_template(
        'teacher/dashboard.html',
        teacher_name=session.get('teacher_name', 'Teacher'),
        courses=courses,
        api_base=API_BASE,
        token=token
    )


@app.route('/teacher/logout')
def teacher_logout():
    session.clear()
    return redirect(url_for('teacher_login'))


# ==================================================
# STUDENT AUTH
# ==================================================

@app.route('/student/login', methods=['GET', 'POST'])
def student_login():
    API_BASE = get_api_base()

    if request.method == 'POST':
        roll = request.form['roll']
        r = requests.get(f'{API_BASE}/students/byroll/{roll}')

        if r.status_code == 200:
            session['student_roll'] = roll
            return redirect(url_for('student_dashboard'))

        return render_template('auth/login.html', role='student', error='Roll not found')

    return render_template('auth/login.html', role='student')


@app.route('/student/dashboard')
def student_dashboard():
    roll = session.get('student_roll')
    if not roll:
        return redirect(url_for('student_login'))

    return render_template(
        'student/dashboard.html',
        roll=roll,
        api_base=get_api_base()
    )


@app.route('/student/attendance-summary')
def student_attendance_summary():
    roll = session.get('student_roll')
    if not roll:
        return redirect(url_for('student_login'))

    return render_template(
        'student/attendance_summary.html',
        roll=roll,
        api_base=get_api_base()
    )


@app.route('/student/logout')
def student_logout():
    session.pop('student_roll', None)
    return redirect(url_for('index'))

@app.route('/teacher/student/<roll>')
def teacher_student_performance(roll):
    if 'teacher_token' not in session:
        return redirect(url_for('teacher_login'))

    return render_template(
        'teacher/student_performance.html',
        roll=roll,
        api_base=get_api_base()
    )

# ==================================================
# RUN
# ==================================================

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=True)
