PRAGMA foreign_keys = ON;

-- Create the tables
CREATE TABLE students (
    student_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY,
    course_name TEXT NOT NULL
);

CREATE TABLE enrolments (
    enrolment_id INTEGER PRIMARY KEY,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade TEXT,
    FOREIGN KEY (student_id) REFERENCES students (student_id),
    FOREIGN KEY (course_id) REFERENCES courses (course_id),
    UNIQUE (student_id, course_id)
);

CREATE INDEX idx_enrolments_course_id ON enrolments (course_id);

-- Add sample students
INSERT INTO students (student_id, name, email) VALUES
    (1, 'Alice Johnson', 'alice@example.com'),
    (2, 'Ben Carter', 'ben@example.com'),
    (3, 'Chloe Davis', 'chloe@example.com'),
    (4, 'Daniel Evans', 'daniel@example.com');

-- Add sample courses
INSERT INTO courses (course_id, course_name) VALUES
    (1, 'SQL Fundamentals'),
    (2, 'Web Development'),
    (3, 'Data Modeling');

-- Add sample enrolments (Daniel has no enrolments)
INSERT INTO enrolments (enrolment_id, student_id, course_id, grade) VALUES
    (1, 1, 1, 'B'),
    (2, 1, 2, 'A'),
    (3, 2, 1, 'C'),
    (4, 2, 3, 'B'),
    (5, 3, 2, 'A');

-- 1. List all courses for a student by name
SELECT c.course_name
FROM courses AS c
JOIN enrolments AS e ON e.course_id = c.course_id
JOIN students AS s ON s.student_id = e.student_id
WHERE s.name = 'Alice Johnson';

-- 2. List all students enrolled in a course
SELECT s.name
FROM students AS s
JOIN enrolments AS e ON e.student_id = s.student_id
JOIN courses AS c ON c.course_id = e.course_id
WHERE c.course_name = 'SQL Fundamentals';

-- 3. Count the students enrolled in each course, including courses with none
SELECT c.course_name, COUNT(e.student_id) AS student_count
FROM courses AS c
LEFT JOIN enrolments AS e ON e.course_id = c.course_id
GROUP BY c.course_id, c.course_name;

-- 4. List students who have no enrolments
SELECT s.name
FROM students AS s
LEFT JOIN enrolments AS e ON e.student_id = s.student_id
WHERE e.student_id IS NULL;

-- 5. Update one student's grade in one course
UPDATE enrolments
SET grade = 'A'
WHERE student_id = 1
  AND course_id = 1;
