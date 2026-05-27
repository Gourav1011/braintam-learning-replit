import { useState } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { BookOpen, GraduationCap } from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

const DEMO_PRICE = 99;
const FULL_PRICES: Record<number, string> = {
  1: "26,999", 2: "27,999", 3: "28,999", 4: "29,999", 5: "30,999",
  6: "31,999", 7: "32,999", 8: "33,999", 9: "34,999", 10: "35,999",
  11: "36,999", 12: "37,999",
};

const DATA: Record<number, { demoSubjects: string[]; fullSubjects: string[]; demoLead: string }> = {
  1: { demoSubjects: ["Counting & Numbers (Tricks)", "Phonics & Reading", "Shapes & Patterns"], fullSubjects: ["Numbers", "English", "EVS"], demoLead: "6-Day camp: basics + fun tricks to start strong." },
  2: { demoSubjects: ["Addition & Tricks", "Reading Skills", "Reasoning Games"], fullSubjects: ["Math", "English", "EVS"], demoLead: "6-Day camp: build speed & confidence." },
  3: { demoSubjects: ["Tables & Tricks", "Science Basics", "Comprehension Tips"], fullSubjects: ["Math", "Science", "English"], demoLead: "6-Day camp: strengthen fundamentals." },
  4: { demoSubjects: ["Fractions Tricks", "Science Experiments", "Grammar Boost"], fullSubjects: ["Math", "Science", "English"], demoLead: "6-Day camp: problem-solving focus." },
  5: { demoSubjects: ["High-weight Math Tricks", "Hands-on Science", "Vocabulary & Writing"], fullSubjects: ["Math", "Science", "Reasoning"], demoLead: "6-Day camp: bridge to middle school." },
  6: { demoSubjects: ["Algebra Basics (Tricks)", "Physics Intros", "Comprehension"], fullSubjects: ["Math", "Science", "English"], demoLead: "6-Day camp: foundation for higher classes." },
  7: { demoSubjects: ["Algebra Tricks", "Mechanics Intro", "Critical Reading"], fullSubjects: ["Math", "Science", "English"], demoLead: "6-Day camp: stronger problem solving." },
  8: { demoSubjects: ["Exam-focused Math Tricks", "Physics Basics", "Chemistry Basics"], fullSubjects: ["Math", "Science(PCB)", "English"], demoLead: "6-Day camp: boards & olympiad readiness." },
  9: { demoSubjects: ["Grade 9 High-yield Math", "Physics Tricks", "Chemistry Tricks"], fullSubjects: ["Math", "Science(PCB)", "English"], demoLead: "6-Day camp: revision & tests." },
  10: { demoSubjects: ["Board Revision Tricks", "Quick Physics", "Chemistry Shortcuts"], fullSubjects: ["Math", "Science", "English"], demoLead: "6-Day camp: board-focused high-yield topics." },
  11: { demoSubjects: ["Calculus Beginnings", "Mechanics Tricks", "Organic Intros"], fullSubjects: ["PCM/PCB/Commerce", "English"], demoLead: "6-Day camp: bridge to class 11 concepts." },
  12: { demoSubjects: ["Exam Revision Tricks", "PYQ Practice", "Strategy & Shortcuts"], fullSubjects: ["PCM/PCB/Commerce", "English"], demoLead: "6-Day camp: final push for boards & entrances." },
};

export default function EnrollPage() {
  const [grade, setGrade] = useState(1);
  const info = DATA[grade] ?? DATA[1];

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1e88e5, #0ea5a3)" }}>
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: NAVY }}>Ashpirant Live Courses · Grades 1–12</h1>
              <p className="text-sm text-gray-500">Concept-first learning, practice & mentor support.</p>
            </div>
          </div>
        </motion.div>

        {/* Grade nav */}
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
            <button
              key={g}
              onClick={() => setGrade(g)}
              className="px-3 py-1.5 rounded-full text-xs font-bold transition-all border"
              style={{
                background: grade === g ? "#fff" : "#eff7ff",
                color: grade === g ? NAVY : "#0B2B6B",
                borderColor: grade === g ? "rgba(11,43,107,0.08)" : "transparent",
                boxShadow: grade === g ? "0 6px 14px rgba(3,10,24,0.05)" : "none",
              }}
            >
              Grade {g}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Demo Card */}
          <motion.div
            key={`demo-${grade}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-extrabold px-2.5 py-1 rounded-full" style={{ background: "linear-gradient(90deg,#fff7eb,#fff)", color: "#b3471f", border: "1px solid rgba(211,77,31,0.05)" }}>
                6-Day Demo
              </span>
              <span className="text-xs text-gray-400 ml-auto">Short preview</span>
            </div>
            <h3 className="font-extrabold text-base mb-1" style={{ color: NAVY }}>6-Day Core Concepts — Demo</h3>
            <p className="text-sm text-gray-500 mb-3">{info.demoLead}</p>

            <div className="flex items-center gap-2 flex-wrap mb-3">
              {info.demoSubjects.map(s => (
                <span key={s} className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: "#f5f8fb", color: "#224a68", border: "1px solid #eef7ff" }}>{s}</span>
              ))}
            </div>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-base font-black" style={{ color: ORANGE }}>₹{DEMO_PRICE}</span>
              <span className="text-xs text-green-600 font-semibold">6-Day program</span>
              <span className="text-xs font-extrabold ml-auto" style={{ color: NAVY }}>5–6 classes / week</span>
            </div>

            <div className="flex gap-2 items-center">
              <Button
                className="rounded-full text-xs font-bold flex-1"
                style={{ background: `linear-gradient(90deg,${NAVY},#0a63a0)`, color: "#fff" }}
                onClick={() => alert(`Demo enrollment for Grade ${grade} will be available soon!`)}
              >
                Join Demo
              </Button>
              <button
                className="text-xs text-gray-400 hover:text-gray-600 underline"
                onClick={() => alert("6-Day demo includes:\n• Quick tricks to improve speed\n• 6 short sessions with practice\n• A sample of full-course teaching style")}
              >
                Why this demo?
              </button>
            </div>
          </motion.div>

          {/* Full Card */}
          <motion.div
            key={`full-${grade}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                Full Year
              </span>
              <span className="text-xs text-gray-400 ml-auto">Best value</span>
            </div>
            <h3 className="font-extrabold text-base mb-1" style={{ color: NAVY }}>Live Full Syllabus — Grade {grade}</h3>
            <p className="text-sm text-gray-500 mb-3">Complete syllabus with tests, homework & reports.</p>

            <div className="flex items-center gap-2 flex-wrap mb-3">
              {info.fullSubjects.map(s => (
                <span key={s} className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: "#f5f8fb", color: "#224a68", border: "1px solid #eef7ff" }}>{s}</span>
              ))}
            </div>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-base font-black" style={{ color: ORANGE }}>₹{FULL_PRICES[grade]}</span>
              <span className="text-xs text-green-600 font-semibold">EMI available</span>
              <span className="text-xs font-extrabold ml-auto" style={{ color: NAVY }}>5–6 classes / week</span>
            </div>

            <div className="flex gap-2 items-center">
              <Button
                variant="outline"
                className="rounded-full text-xs font-bold flex-1"
                style={{ borderColor: NAVY, color: NAVY }}
                onClick={() => alert(`Full enrollment for Grade ${grade} will be available soon!`)}
              >
                Enroll Full
              </Button>
              <button
                className="text-xs text-gray-400 hover:text-gray-600 underline"
                onClick={() => alert("Talk to a counsellor form will be available soon.")}
              >
                Talk to Counsellor
              </button>
            </div>
          </motion.div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 text-sm text-gray-500">
          <h4 className="font-bold text-gray-700 mb-1 text-sm">Why parents choose Braintam</h4>
          <p>Live classes, structured practice and clear progress reports — tight & focused delivery.</p>
        </div>
      </div>
    </AppLayout>
  );
}
