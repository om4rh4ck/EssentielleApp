CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  role ENUM('student','instructor','admin') NOT NULL DEFAULT 'student',
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(60) NULL,
  city VARCHAR(120) NULL,
  country VARCHAR(120) NULL,
  objective TEXT NULL,
  bio TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================
-- Catalog / Courses
-- =========================

CREATE TABLE IF NOT EXISTS courses (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  instructor_id VARCHAR(64) NOT NULL,
  thumbnail VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  access ENUM('free','paid') NOT NULL DEFAULT 'free',
  price_eur DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_tnd DECIMAL(10,2) NULL,
  price_usd DECIMAL(10,2) NULL,
  pricing_currency ENUM('EUR','TND','USD') NOT NULL DEFAULT 'EUR',
  promo_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  promo_price_eur DECIMAL(10,2) NULL,
  promo_price_tnd DECIMAL(10,2) NULL,
  promo_price_usd DECIMAL(10,2) NULL,
  category VARCHAR(120) NOT NULL DEFAULT 'Formation',
  status ENUM('published','draft') NOT NULL DEFAULT 'published',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS course_modules (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  course_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  pdf_name VARCHAR(255) NOT NULL,
  pdf_data_url MEDIUMTEXT NOT NULL,
  sort_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_course_modules_course
    FOREIGN KEY (course_id) REFERENCES courses(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_course_modules_course_id ON course_modules(course_id);

-- =========================
-- Training formulas
-- =========================

CREATE TABLE IF NOT EXISTS training_formulas (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  image VARCHAR(255) NOT NULL,
  instructor_id VARCHAR(64) NOT NULL,
  price_eur DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_tnd DECIMAL(10,2) NULL,
  price_usd DECIMAL(10,2) NULL,
  pricing_currency ENUM('EUR','TND','USD') NOT NULL DEFAULT 'EUR',
  promo_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  promo_price_eur DECIMAL(10,2) NULL,
  promo_price_tnd DECIMAL(10,2) NULL,
  promo_price_usd DECIMAL(10,2) NULL,
  status ENUM('published','draft') NOT NULL DEFAULT 'published',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS training_formula_highlights (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  formula_id VARCHAR(64) NOT NULL,
  highlight TEXT NOT NULL,
  sort_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_formula_highlights_formula
    FOREIGN KEY (formula_id) REFERENCES training_formulas(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_formula_highlights_formula_id ON training_formula_highlights(formula_id);

-- =========================
-- Enrollments / Student workspace
-- =========================

CREATE TABLE IF NOT EXISTS student_course_enrollments (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL,
  course_id VARCHAR(64) NOT NULL,
  progress INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_course (student_id, course_id),
  CONSTRAINT fk_enroll_course
    FOREIGN KEY (course_id) REFERENCES courses(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_enrollments_course_id ON student_course_enrollments(course_id);
CREATE INDEX idx_enrollments_student_id ON student_course_enrollments(student_id);

CREATE TABLE IF NOT EXISTS student_certificates (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL,
  course_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  issued_at DATETIME NOT NULL,
  status ENUM('issued','pending') NOT NULL DEFAULT 'pending',
  signed_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cert_course
    FOREIGN KEY (course_id) REFERENCES courses(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cert_student
    FOREIGN KEY (student_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_cert_student_id ON student_certificates(student_id);
CREATE INDEX idx_cert_course_id ON student_certificates(course_id);

-- =========================
-- Exams
-- =========================

CREATE TABLE IF NOT EXISTS exams (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  course_id VARCHAR(64) NOT NULL,
  assigned_by VARCHAR(255) NOT NULL,
  due_date DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_exam_course
    FOREIGN KEY (course_id) REFERENCES courses(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_exams_course_id ON exams(course_id);

CREATE TABLE IF NOT EXISTS exam_questions (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  exam_id VARCHAR(64) NOT NULL,
  prompt TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  correct_index INT NOT NULL DEFAULT 0,
  points INT NOT NULL DEFAULT 0,
  sort_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_exam_questions_exam
    FOREIGN KEY (exam_id) REFERENCES exams(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_exam_questions_exam_id ON exam_questions(exam_id);

CREATE TABLE IF NOT EXISTS student_exam_attempts (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL,
  exam_id VARCHAR(64) NOT NULL,
  answers_json MEDIUMTEXT NOT NULL,
  score INT NOT NULL DEFAULT 0,
  submitted_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_exam (student_id, exam_id),
  CONSTRAINT fk_attempts_exam
    FOREIGN KEY (exam_id) REFERENCES exams(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_attempts_student_id ON student_exam_attempts(student_id);
CREATE INDEX idx_attempts_exam_id ON student_exam_attempts(exam_id);

-- =========================
-- Schedule / Live sessions / Resources
-- =========================

CREATE TABLE IF NOT EXISTS schedule_entries (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  instructor_id VARCHAR(64) NOT NULL,
  course_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  day VARCHAR(32) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  format ENUM('online','onsite','hybrid') NOT NULL DEFAULT 'online',
  room VARCHAR(255) NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_schedule_course
    FOREIGN KEY (course_id) REFERENCES courses(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_schedule_instructor_id ON schedule_entries(instructor_id);
CREATE INDEX idx_schedule_course_id ON schedule_entries(course_id);

CREATE TABLE IF NOT EXISTS live_sessions (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  instructor_id VARCHAR(64) NOT NULL,
  course_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  scheduled_at DATETIME NOT NULL,
  meet_link VARCHAR(255) NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_live_course
    FOREIGN KEY (course_id) REFERENCES courses(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_live_instructor_id ON live_sessions(instructor_id);
CREATE INDEX idx_live_course_id ON live_sessions(course_id);

CREATE TABLE IF NOT EXISTS resources (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  instructor_id VARCHAR(64) NOT NULL,
  course_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type ENUM('pdf','video','audio','link') NOT NULL DEFAULT 'link',
  url VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_resources_course
    FOREIGN KEY (course_id) REFERENCES courses(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_resources_instructor_id ON resources(instructor_id);
CREATE INDEX idx_resources_course_id ON resources(course_id);

-- =========================
-- Messages (Q&A)
-- =========================

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL,
  sender_id VARCHAR(64) NOT NULL,
  sender_role ENUM('student','instructor','admin') NOT NULL,
  sender_name VARCHAR(255) NOT NULL,
  recipient_id VARCHAR(64) NOT NULL,
  recipient_role ENUM('student','instructor','admin') NOT NULL,
  recipient_name VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  sent_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_messages_student
    FOREIGN KEY (student_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_messages_student_id ON messages(student_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);

-- =========================
-- Enrollment requests (public enrollment)
-- =========================

CREATE TABLE IF NOT EXISTS enrollment_requests (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  course_id VARCHAR(64) NOT NULL,
  course_title VARCHAR(255) NOT NULL,
  course_access ENUM('free','paid') NOT NULL DEFAULT 'free',
  formula_id VARCHAR(64) NULL,
  formula_title VARCHAR(255) NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(60) NOT NULL,
  city VARCHAR(120) NOT NULL,
  country VARCHAR(120) NOT NULL,
  message TEXT NOT NULL,
  requested_at DATETIME NOT NULL,
  CONSTRAINT fk_enrollment_req_course
    FOREIGN KEY (course_id) REFERENCES courses(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_enrollment_requests_course_id ON enrollment_requests(course_id);
CREATE INDEX idx_enrollment_requests_email ON enrollment_requests(email);

-- =========================
-- Payments (admin dashboard)
-- =========================

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL,
  student_name VARCHAR(255) NOT NULL,
  course_id VARCHAR(64) NOT NULL,
  amount_eur DECIMAL(10,2) NOT NULL DEFAULT 0,
  status ENUM('paid','pending') NOT NULL DEFAULT 'pending',
  paid_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_course
    FOREIGN KEY (course_id) REFERENCES courses(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_payments_student
    FOREIGN KEY (student_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_payments_course_id ON payments(course_id);
CREATE INDEX idx_payments_student_id ON payments(student_id);

-- =========================
-- NOTE
-- Seeds are expected to be inserted by backend migration logic (server.ts) once routes switch from in-memory to DB.
-- =========================
