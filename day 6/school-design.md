# School Database Design

## Tables

- **students** stores each student's ID, name, and email. The email is required and unique so the same email cannot be assigned to multiple students.
- **courses** stores each course's ID and name.
- **enrolments** records which student is taking which course, along with an optional grade. Its foreign keys refer to `students` and `courses`, and its unique constraint prevents a student from being enrolled in the same course twice.

## Relationships

- **Students to enrolments: one-to-many.** A student can have multiple enrolment records, while each enrolment belongs to exactly one student.
- **Courses to enrolments: one-to-many.** A course can have multiple enrolment records, while each enrolment belongs to exactly one course.
- **Students to courses: many-to-many.** A student can take many courses, and each course can have many students. The `enrolments` join table is needed to represent this relationship using relational tables. It also stores relationship-specific data such as the student's grade in a course.

## Index

The SQL script creates `idx_enrolments_course_id` on `enrolments(course_id)`. This helps lookups that find all students on a course and queries that count enrolments per course. The unique constraint on `(student_id, course_id)` already supports lookups starting with `student_id`, but it does not provide the same access path when searching by `course_id`.

## SQL or NoSQL?

I would choose a relational SQL database for this system. Students, courses, and enrolments have clear relationships, and foreign keys and unique constraints help preserve data integrity—for example, preventing enrolments for nonexistent students or duplicate enrolments. SQL joins also make the requested reports straightforward. A NoSQL database could work if the data or access patterns required a more flexible document structure, but that flexibility is not necessary for this system.
