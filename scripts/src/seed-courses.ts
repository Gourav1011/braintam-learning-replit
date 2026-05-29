/**
 * Seed comprehensive course catalog:
 * - Full year courses for Grades 1–10 across all subjects
 * - Competitive exam / Olympiad preparation courses
 */

const TOKEN = "MjoxNzgwMDUwMTMyMjYyOmJyYWludGFt";
const BASE = "http://localhost:80";
const YEAR_ID = 4; // 2026-27

const THUMBS: Record<string, string> = {
  math:    "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80",
  science: "https://images.unsplash.com/photo-1532094349884-543559171a43?w=800&q=80",
  english: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=80",
  hindi:   "https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80",
  social:  "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&q=80",
  cs:      "https://images.unsplash.com/photo-1580894742597-87bc8789db3d?w=800&q=80",
  olympiad:"https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=800&q=80",
  jee:     "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&q=80",
  neet:    "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&q=80",
  ntse:    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80",
  cyber:   "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
  speed:   "https://images.unsplash.com/photo-1629752187687-3d3c7ea3a21b?w=800&q=80",
};

interface CoursePayload {
  title: string;
  subjectId: number | null;
  grade: number;
  totalLessons: number;
  thumbnailUrl: string;
  description: string;
  teacher: string;
  board: string;
  academicYearId: number;
  isPublished: boolean;
  rating: number;
}

const courses: CoursePayload[] = [];

// ── Full Year Courses — Grades 1 to 10 ─────────────────────────────────────

const gradeBoards: Record<number, string> = {
  1:"CBSE", 2:"CBSE", 3:"CBSE", 4:"CBSE", 5:"CBSE",
  6:"CBSE", 7:"CBSE", 8:"CBSE", 9:"CBSE", 10:"CBSE",
};

const subjects = [
  { id: 1, key: "math",    name: "Mathematics",     teacher: "Dr. Priya Sharma" },
  { id: 2, key: "science", name: "Science",          teacher: "Mr. Rajesh Verma" },
  { id: 3, key: "english", name: "English",          teacher: "Ms. Anita Kapoor" },
  { id: 4, key: "hindi",   name: "Hindi",            teacher: "Mrs. Sunita Devi" },
  { id: 5, key: "social",  name: "Social Science",   teacher: "Mr. Arjun Mehta" },
  { id: 6, key: "cs",      name: "Computer Science", teacher: "Ms. Kavya Nair" },
];

const lessonsByGrade: Record<number, number> = {
  1:24, 2:26, 3:28, 4:30, 5:32, 6:36, 7:38, 8:40, 9:44, 10:48,
};
const ratingsBySubj: Record<string, number> = {
  math:4.8, science:4.7, english:4.6, hindi:4.5, social:4.6, cs:4.9,
};

const mathTopics: Record<number, string> = {
  1: "Numbers 1–100, Addition, Subtraction, Shapes & Patterns",
  2: "Numbers to 1000, Multiplication Tables, Basic Geometry",
  3: "Large Numbers, Fractions, Division, Time & Calendar",
  4: "Fractions, Decimals, Factors & Multiples, Area & Perimeter",
  5: "Decimal Operations, LCM/HCF, Percentage, Geometry",
  6: "Integers, Ratios, Basic Algebra, Data Handling",
  7: "Rational Numbers, Linear Equations, Triangles, Statistics",
  8: "Cubes & Squares, Algebraic Expressions, Mensuration, Graphs",
  9: "Number Systems, Polynomials, Coordinate Geometry, Triangles, Statistics",
  10: "Real Numbers, Polynomials, Quadratics, Trigonometry, Circles, Statistics",
};
const sciTopics: Record<number, string> = {
  1: "Plants, Animals, Food, Water, Air & Our Body",
  2: "Plants & Animals, Food & Health, Air & Water",
  3: "Plants & Animals, Food, Materials, Water, Light & Shadow",
  4: "Nutrition, Adaptation, Rocks & Minerals, Light, Electric Current",
  5: "Food & Health, Materials, World of Plants, Natural Phenomena",
  6: "Food & Components, Fibre, Changes Around Us, Motion & Measurement",
  7: "Nutrition, Acids & Bases, Motion & Time, Light, Forests",
  8: "Crops, Microorganisms, Synthetic Fibres, Metals, Coal & Petroleum, Light",
  9: "Matter, Atoms, Cells, Tissues, Motion, Force, Work & Energy, Sound",
  10: "Chemical Reactions, Acids-Bases-Salts, Metals, Carbon, Life Processes, Electricity, Magnetic Effects, Light",
};

for (const grade of [1,2,3,4,5,6,7,8,9,10]) {
  for (const subj of subjects) {
    let desc = "";
    if (subj.key === "math") desc = `Complete CBSE Grade ${grade} Mathematics — ${mathTopics[grade] ?? "Full syllabus as per NCERT"}. Includes concept videos, practice worksheets, chapter tests and live doubt sessions.`;
    else if (subj.key === "science") desc = `Complete CBSE Grade ${grade} Science — ${sciTopics[grade] ?? "Full syllabus as per NCERT"}. Animated videos, experiments, worksheets and mock tests.`;
    else if (subj.key === "english") desc = `CBSE Grade ${grade} English — Grammar, Reading Comprehension, Writing Skills, Literature & Poetry. Step-by-step concept building with exercises.`;
    else if (subj.key === "hindi") desc = `CBSE Grade ${grade} Hindi — व्याकरण, पाठ्यक्रम, गद्य-पद्य, लेखन कौशल और साहित्य। पूर्ण NCERT पाठ्यक्रम के अनुसार।`;
    else if (subj.key === "social") desc = `CBSE Grade ${grade} Social Science — History, Geography, Civics & Economics. Map work, timeline activities, MCQs and project support.`;
    else if (subj.key === "cs") desc = `Grade ${grade} Computer Science — Fundamentals of computers, MS Office, internet basics${grade >= 7 ? ", Introduction to programming (Python/Scratch)" : ""}. Hands-on lab exercises included.`;

    courses.push({
      title: `Grade ${grade} ${subj.name} — Full Year Course`,
      subjectId: subj.id,
      grade,
      totalLessons: lessonsByGrade[grade],
      thumbnailUrl: THUMBS[subj.key],
      description: desc,
      teacher: subj.teacher,
      board: gradeBoards[grade],
      academicYearId: YEAR_ID,
      isPublished: true,
      rating: ratingsBySubj[subj.key],
    });
  }
}

// ── Olympiad / Competitive Courses ─────────────────────────────────────────

const competitiveTeachers = [
  "Dr. Amit Kumar", "Ms. Pooja Singh", "Mr. Suresh Gupta",
  "Dr. Nidhi Agarwal", "Mr. Vikram Sinha", "Ms. Rekha Joshi",
];

const olympiadCourses: CoursePayload[] = [
  // SOF IMO — International Maths Olympiad
  ...([3,4,5,6,7,8,9,10] as const).map((g, i) => ({
    title: `Maths Olympiad (IMO) Prep — Grade ${g}`,
    subjectId: 1,
    grade: g,
    totalLessons: 30,
    thumbnailUrl: THUMBS.olympiad,
    description: `Comprehensive preparation for SOF International Mathematics Olympiad (IMO) Grade ${g}. Covers logical reasoning, advanced problem-solving, pattern recognition, and past paper practice. Perfect for students aiming for Gold/Silver medals.`,
    teacher: competitiveTeachers[i % competitiveTeachers.length],
    board: "Olympiad",
    academicYearId: YEAR_ID,
    isPublished: true,
    rating: 4.9,
  })),

  // SOF NSO — National Science Olympiad
  ...([3,4,5,6,7,8,9,10] as const).map((g, i) => ({
    title: `Science Olympiad (NSO) Prep — Grade ${g}`,
    subjectId: 2,
    grade: g,
    totalLessons: 28,
    thumbnailUrl: THUMBS.olympiad,
    description: `SOF National Science Olympiad (NSO) Grade ${g} preparation. Includes scientific reasoning, experiment-based questions, application problems, and full-length mock tests with detailed solutions.`,
    teacher: competitiveTeachers[(i + 1) % competitiveTeachers.length],
    board: "Olympiad",
    academicYearId: YEAR_ID,
    isPublished: true,
    rating: 4.8,
  })),

  // SOF IEO — International English Olympiad
  ...([3,4,5,6,7,8,9,10] as const).map((g, i) => ({
    title: `English Olympiad (IEO) Prep — Grade ${g}`,
    subjectId: 3,
    grade: g,
    totalLessons: 24,
    thumbnailUrl: THUMBS.english,
    description: `SOF International English Olympiad (IEO) Grade ${g}. Vocabulary, grammar, reading comprehension, creative writing, and spoken English practice. Achiever-level questions included.`,
    teacher: competitiveTeachers[(i + 2) % competitiveTeachers.length],
    board: "Olympiad",
    academicYearId: YEAR_ID,
    isPublished: true,
    rating: 4.7,
  })),

  // Cyber Olympiad
  ...([4,5,6,7,8,9,10] as const).map((g, i) => ({
    title: `Cyber Olympiad (ICO) Prep — Grade ${g}`,
    subjectId: 6,
    grade: g,
    totalLessons: 22,
    thumbnailUrl: THUMBS.cyber,
    description: `International Cyber Olympiad (ICO) Grade ${g} preparation. Covers computer fundamentals, MS Office, internet safety, coding concepts, and logical reasoning. Chapter-wise tests + mock papers.`,
    teacher: competitiveTeachers[(i + 3) % competitiveTeachers.length],
    board: "Olympiad",
    academicYearId: YEAR_ID,
    isPublished: true,
    rating: 4.8,
  })),

  // GK Olympiad
  ...([4,5,6,7,8] as const).map((g, i) => ({
    title: `General Knowledge Olympiad Prep — Grade ${g}`,
    subjectId: 5,
    grade: g,
    totalLessons: 20,
    thumbnailUrl: THUMBS.social,
    description: `GK Olympiad Grade ${g} — Current affairs, Indian history, world geography, science facts, sports & culture, and logical GK puzzles. Builds awareness and reasoning skills for competitive exams.`,
    teacher: competitiveTeachers[(i + 4) % competitiveTeachers.length],
    board: "Olympiad",
    academicYearId: YEAR_ID,
    isPublished: true,
    rating: 4.6,
  })),

  // NTSE Foundation
  { title: "NTSE Foundation — Grade 9", subjectId: null, grade: 9, totalLessons: 52,
    thumbnailUrl: THUMBS.ntse,
    description: "National Talent Search Examination (NTSE) Stage 1 & 2 preparation for Grade 9 students. Covers Mental Ability Test (MAT) — Verbal & Non-Verbal Reasoning, and Scholastic Aptitude Test (SAT) — Mathematics, Science, Social Science & English. Previous year papers + full mock tests.",
    teacher: "Dr. Meera Krishnan", board: "NTSE", academicYearId: YEAR_ID, isPublished: true, rating: 4.9 },
  { title: "NTSE Foundation — Grade 10", subjectId: null, grade: 10, totalLessons: 60,
    thumbnailUrl: THUMBS.ntse,
    description: "Complete NTSE Stage 1 + Stage 2 crash course for Grade 10. MAT (Reasoning) + SAT (Maths, Science, Social Science, English, Hindi). 50+ mock tests, previous year analysis, and expert doubt-clearing sessions.",
    teacher: "Dr. Meera Krishnan", board: "NTSE", academicYearId: YEAR_ID, isPublished: true, rating: 4.9 },

  // JEE Foundation
  { title: "JEE Foundation Mathematics — Grade 8", subjectId: 1, grade: 8, totalLessons: 44,
    thumbnailUrl: THUMBS.jee,
    description: "JEE Foundation Mathematics for Grade 8 — Number theory, algebra, geometry, and problem-solving at the pre-JEE level. Builds the conceptual depth needed for JEE Main & Advanced. 500+ practice problems.",
    teacher: "Mr. Kapil Bansal", board: "JEE", academicYearId: YEAR_ID, isPublished: true, rating: 4.9 },
  { title: "JEE Foundation Mathematics — Grade 9", subjectId: 1, grade: 9, totalLessons: 52,
    thumbnailUrl: THUMBS.jee,
    description: "JEE Foundation Mathematics for Grade 9 — Polynomials, coordinate geometry, quadratics, trigonometry basics, and statistics. Covers CBSE + competitive depth with IIT-level problem practice.",
    teacher: "Mr. Kapil Bansal", board: "JEE", academicYearId: YEAR_ID, isPublished: true, rating: 4.9 },
  { title: "JEE Foundation Mathematics — Grade 10", subjectId: 1, grade: 10, totalLessons: 60,
    thumbnailUrl: THUMBS.jee,
    description: "JEE Foundation Mathematics for Grade 10 — Real numbers, polynomials, pair of equations, quadratics, arithmetic progressions, coordinate geometry, trigonometry, mensuration, and probability. Dual prep: CBSE Board + JEE.",
    teacher: "Mr. Kapil Bansal", board: "JEE", academicYearId: YEAR_ID, isPublished: true, rating: 4.9 },
  { title: "JEE Foundation Physics — Grade 9", subjectId: 2, grade: 9, totalLessons: 40,
    thumbnailUrl: THUMBS.jee,
    description: "JEE Foundation Physics for Grade 9 — Motion, force, gravity, work & energy, sound, and light. Numerical problem-solving approach aligned with JEE Main physics style.",
    teacher: "Dr. Rohit Sharma", board: "JEE", academicYearId: YEAR_ID, isPublished: true, rating: 4.8 },
  { title: "JEE Foundation Physics — Grade 10", subjectId: 2, grade: 10, totalLessons: 48,
    thumbnailUrl: THUMBS.jee,
    description: "JEE Foundation Physics for Grade 10 — Electricity, magnetic effects of current, light (reflection & refraction), human eye, and sources of energy. Board + JEE dual preparation.",
    teacher: "Dr. Rohit Sharma", board: "JEE", academicYearId: YEAR_ID, isPublished: true, rating: 4.8 },
  { title: "JEE Foundation Chemistry — Grade 9", subjectId: 2, grade: 9, totalLessons: 36,
    thumbnailUrl: THUMBS.jee,
    description: "JEE Foundation Chemistry for Grade 9 — Matter, atoms & molecules, structure of atom, chemical reactions, and natural resources. Connects NCERT fundamentals to JEE-level concepts.",
    teacher: "Ms. Prerna Agarwal", board: "JEE", academicYearId: YEAR_ID, isPublished: true, rating: 4.8 },
  { title: "JEE Foundation Chemistry — Grade 10", subjectId: 2, grade: 10, totalLessons: 44,
    thumbnailUrl: THUMBS.jee,
    description: "JEE Foundation Chemistry for Grade 10 — Chemical reactions, acids-bases-salts, metals & non-metals, carbon compounds, and periodic classification. Board exam + JEE Foundation aligned.",
    teacher: "Ms. Prerna Agarwal", board: "JEE", academicYearId: YEAR_ID, isPublished: true, rating: 4.8 },

  // NEET Foundation
  { title: "NEET Foundation Biology — Grade 9", subjectId: 2, grade: 9, totalLessons: 40,
    thumbnailUrl: THUMBS.neet,
    description: "NEET Foundation Biology for Grade 9 — Cell structure, tissues, diversity in living organisms, why do we fall ill, natural resources, and food production. NCERT + NEET application-level questions.",
    teacher: "Dr. Anjali Rao", board: "NEET", academicYearId: YEAR_ID, isPublished: true, rating: 4.8 },
  { title: "NEET Foundation Biology — Grade 10", subjectId: 2, grade: 10, totalLessons: 48,
    thumbnailUrl: THUMBS.neet,
    description: "NEET Foundation Biology for Grade 10 — Life processes, control & coordination, reproduction, heredity & evolution, our environment, and natural resource management. Comprehensive NEET-ready preparation.",
    teacher: "Dr. Anjali Rao", board: "NEET", academicYearId: YEAR_ID, isPublished: true, rating: 4.9 },

  // Speed Maths / Mental Ability
  { title: "Speed Maths & Mental Ability — Grade 6–8", subjectId: 1, grade: 7, totalLessons: 24,
    thumbnailUrl: THUMBS.speed,
    description: "Master rapid calculation techniques — Vedic Maths, shortcuts for multiplication/division, fraction tricks, percentage estimation, and mental arithmetic puzzles. Ideal for competitive exams and general speed improvement.",
    teacher: "Mr. Sanjay Pandey", board: "Competitive", academicYearId: YEAR_ID, isPublished: true, rating: 4.7 },
  { title: "Speed Maths & Mental Ability — Grade 9–10", subjectId: 1, grade: 9, totalLessons: 28,
    thumbnailUrl: THUMBS.speed,
    description: "Advanced mental mathematics for senior students — Vedic Maths, algebraic shortcuts, data interpretation under time pressure, and logical reasoning drills. Essential for NTSE, Olympiads, and board exams.",
    teacher: "Mr. Sanjay Pandey", board: "Competitive", academicYearId: YEAR_ID, isPublished: true, rating: 4.8 },

  // KVPY
  { title: "KVPY SX Foundation — Grade 10", subjectId: null, grade: 10, totalLessons: 56,
    thumbnailUrl: THUMBS.jee,
    description: "KVPY (Kishore Vaigyanik Protsahan Yojana) SX stream preparation for Grade 10. Advanced Physics, Chemistry, Biology, and Mathematics beyond NCERT. Fellowships + IISc/IISERs pathway. Full syllabus with aptitude mock tests.",
    teacher: "Dr. Siddharth Nair", board: "KVPY", academicYearId: YEAR_ID, isPublished: true, rating: 4.9 },
];

courses.push(...olympiadCourses);

// ── Create courses via API ──────────────────────────────────────────────────

async function createCourse(c: CoursePayload): Promise<void> {
  const res = await fetch(`${BASE}/api/admin/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(c),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`  ✗ ${c.title} — ${res.status} ${text}`);
  } else {
    const d = await res.json() as { id: number };
    console.log(`  ✓ [${c.grade}] ${c.title} (id: ${d.id})`);
  }
}

async function main() {
  console.log(`Creating ${courses.length} courses…\n`);
  // Batch in groups of 10 to avoid overwhelming
  for (let i = 0; i < courses.length; i += 10) {
    await Promise.all(courses.slice(i, i + 10).map(createCourse));
  }
  console.log(`\nDone! ${courses.length} courses processed.`);
}

main().catch(console.error);
