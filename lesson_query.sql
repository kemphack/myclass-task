SELECT *
FROM
  "lessons" l INNER JOIN "lesson_students" ls ON
    l.id=ls.lesson_id
  INNER JOIN "students" s ON
    s.id=ls.student_id