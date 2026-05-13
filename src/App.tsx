/// <reference types="vite/client" />

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { AnimatePresence, motion } from "framer-motion";
import * as XLSX from "xlsx";
import {
  BookOpen,
  Building2,
  Calculator,
  FilePenLine,
  Gauge,
  GraduationCap,
  LogOut,
  Menu,
  PencilRuler,
  KeyRound,
  BadgePercent,
  Settings,
  SlidersHorizontal,
  Users,
} from "lucide-react";

type PageKey = "dashboard" | "students" | "subjects" | "settings" | "rapor" | "ujian" | "ijazah";

type UserSession = {
  id: string;
  email: string;
  mode: "supabase" | "local";
};

type Student = {
  id: string;
  owner_id: string;
  nisn: string;
  nama: string;
  kelas: string;
  tahun_ajaran: string;
  status: "aktif" | "lulus";
};

type Subject = {
  id: string;
  owner_id: string;
  kode_mapel: string;
  nama_mapel: string;
  kelompok: string;
  urutan: number;
  aktif: boolean;
};

type ReportGrade = {
  id: string;
  owner_id: string;
  student_id: string;
  subject_id: string;
  s1: number;
  s2: number;
  s3: number;
  s4: number;
  s5: number;
};

type ExamGrade = {
  id: string;
  owner_id: string;
  student_id: string;
  subject_id: string;
  nilai_ujian: number;
};

type AppSettings = {
  owner_id: string;
  nama_madrasah: string;
  alamat_madrasah: string;
  kabupaten_kota: string;
  tahun_pelajaran: string;
  nama_kepala_madrasah: string;
  nip_kepala: string;
  logo_url: string;
  persen_rapor: number;
  persen_ujian: number;
};

type LocalPayload = {
  students: Student[];
  subjects: Subject[];
  reportGrades: ReportGrade[];
  examGrades: ExamGrade[];
  settings?: AppSettings;
};

type DiplomaRow = {
  student: Student;
  total: number;
  rata: number;
  perMapel: Array<{ subject: Subject; nilai: number }>;
};

const defaultSettings = (ownerId: string): AppSettings => ({
  owner_id: ownerId,
  nama_madrasah: "Madrasah Hebat",
  alamat_madrasah: "-",
  kabupaten_kota: "-",
  tahun_pelajaran: "2025/2026",
  nama_kepala_madrasah: "-",
  nip_kepala: "-",
  logo_url: "https://upload.wikimedia.org/wikipedia/commons/8/82/Seal_of_the_Ministry_of_Religious_Affairs_of_the_Republic_of_Indonesia.svg",
  persen_rapor: 60,
  persen_ujian: 40,
});

function normalizeSettings(raw: Partial<AppSettings> & Record<string, unknown>, ownerId: string): AppSettings {
  return {
    owner_id: ownerId,
    nama_madrasah: (raw.nama_madrasah as string) ?? (raw.nama_sekolah as string) ?? "Madrasah Hebat",
    alamat_madrasah: (raw.alamat_madrasah as string) ?? (raw.alamat as string) ?? "-",
    kabupaten_kota: (raw.kabupaten_kota as string) ?? (raw.kota as string) ?? "-",
    tahun_pelajaran: (raw.tahun_pelajaran as string) ?? "2025/2026",
    nama_kepala_madrasah: (raw.nama_kepala_madrasah as string) ?? (raw.kepala_sekolah as string) ?? "-",
    nip_kepala: (raw.nip_kepala as string) ?? "-",
    logo_url: (raw.logo_url as string) ?? (raw.logo as string) ?? defaultSettings(ownerId).logo_url,
    persen_rapor: Number(raw.persen_rapor ?? 60),
    persen_ujian: Number(raw.persen_ujian ?? 40),
  };
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const supabaseEnabled = Boolean(supabaseUrl && supabaseAnonKey);
const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

const tableNames = {
  students: "students",
  subjects: "subjects",
  report: "report_grades",
  exam: "exam_grades",
  settings: "app_settings",
} as const;

const navItems: Array<{ key: PageKey; label: string; section: string; icon: typeof Gauge }> = [
  { key: "dashboard", label: "Dashboard", section: "Menu Utama", icon: Gauge },
  { key: "students", label: "Data Siswa", section: "Master Data", icon: Users },
  { key: "subjects", label: "Mata Pelajaran", section: "Master Data", icon: BookOpen },
  { key: "settings", label: "Pengaturan Sistem", section: "Master Data", icon: SlidersHorizontal },
  { key: "rapor", label: "Nilai Rapor", section: "Nilai & Proses", icon: PencilRuler },
  { key: "ujian", label: "Nilai Ujian", section: "Nilai & Proses", icon: FilePenLine },
  { key: "ijazah", label: "Proses Ijazah", section: "Nilai & Proses", icon: Calculator },
];

const fieldClassName =
  "w-full rounded-xl border border-zinc-300/90 bg-white px-3 py-2.5 text-sm text-zinc-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

const primaryButtonClassName =
  "rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-900/10 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60";

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

function toSafeOrder(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0)
    .map((line: string) => line.split(",").map((cell: string) => cell.trim()));
}

function toCsv(rows: string[][]): string {
  return rows
    .map((row: string[]) => row.map((cell: string) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function downloadCsv(fileName: string, rows: string[][]): void {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function localDataKey(ownerId: string): string {
  return `ijazah_data_${ownerId}`;
}

function loadLocalPayload(ownerId: string): LocalPayload {
  const raw = localStorage.getItem(localDataKey(ownerId));
  if (!raw) {
    return {
      students: [],
      subjects: [],
      reportGrades: [],
      examGrades: [],
      settings: defaultSettings(ownerId),
    };
  }
  try {
    const parsed = JSON.parse(raw) as LocalPayload;
    return {
      students: parsed.students ?? [],
      subjects: parsed.subjects ?? [],
      reportGrades: parsed.reportGrades ?? [],
      examGrades: parsed.examGrades ?? [],
      settings: parsed.settings ?? defaultSettings(ownerId),
    };
  } catch {
    return {
      students: [],
      subjects: [],
      reportGrades: [],
      examGrades: [],
      settings: defaultSettings(ownerId),
    };
  }
}

function saveLocalPayload(ownerId: string, payload: LocalPayload): void {
  localStorage.setItem(localDataKey(ownerId), JSON.stringify(payload));
}

function ensureLocalUsers(): void {
  const key = "ijazah_users";
  const raw = localStorage.getItem(key);
  if (raw) return;
  const users = [{ id: "local_admin", email: "admin", password: "Madrasahebat!" }];
  localStorage.setItem(key, JSON.stringify(users));
}

async function loginWithPassword(email: string, password: string): Promise<UserSession> {
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) throw new Error(error?.message ?? "Login gagal");
    return { id: data.user.id, email: data.user.email ?? email, mode: "supabase" };
  }
  ensureLocalUsers();
  const usersRaw = localStorage.getItem("ijazah_users") ?? "[]";
  const users = JSON.parse(usersRaw) as Array<{ id: string; email: string; password: string }>;
  const found = users.find((user) => user.email === email && user.password === password);
  if (!found) throw new Error("Username atau password salah");
  return { id: found.id, email: found.email, mode: "local" };
}

async function registerWithPassword(email: string, password: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    return;
  }
  ensureLocalUsers();
  const usersRaw = localStorage.getItem("ijazah_users") ?? "[]";
  const users = JSON.parse(usersRaw) as Array<{ id: string; email: string; password: string }>;
  const exists = users.some((user) => user.email === email);
  if (exists) throw new Error("User sudah ada");
  users.push({ id: uid("local"), email, password });
  localStorage.setItem("ijazah_users", JSON.stringify(users));
}

async function getCurrentSession(): Promise<UserSession | null> {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return null;
    return { id: user.id, email: user.email ?? "-", mode: "supabase" };
  }
  const saved = localStorage.getItem("ijazah_active_user");
  if (!saved) return null;
  return JSON.parse(saved) as UserSession;
}

async function logoutSession(): Promise<void> {
  if (supabase) {
    await supabase.auth.signOut();
    return;
  }
  localStorage.removeItem("ijazah_active_user");
}

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [page, setPage] = useState<PageKey>("dashboard");
  const [mobileSidebar, setMobileSidebar] = useState<boolean>(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [reportGrades, setReportGrades] = useState<ReportGrade[]>([]);
  const [examGrades, setExamGrades] = useState<ExamGrade[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const [loginEmail, setLoginEmail] = useState<string>("admin");
  const [loginPassword, setLoginPassword] = useState<string>("Madrasahebat!");
  const [captchaA, setCaptchaA] = useState<number>(3);
  const [captchaB, setCaptchaB] = useState<number>(5);
  const [captchaAnswer, setCaptchaAnswer] = useState<string>("");

  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [studentForm, setStudentForm] = useState<Omit<Student, "owner_id">>({
    id: "",
    nisn: "",
    nama: "",
    kelas: "",
    tahun_ajaran: "",
    status: "aktif",
  });
  const [subjectForm, setSubjectForm] = useState<Omit<Subject, "owner_id">>({
    id: "",
    kode_mapel: "",
    nama_mapel: "",
    kelompok: "Umum",
    urutan: 1,
    aktif: true,
  });

  const [selectedRaporSubject, setSelectedRaporSubject] = useState<string>("");
  const [selectedUjianSubject, setSelectedUjianSubject] = useState<string>("");
  const [raporDraft, setRaporDraft] = useState<Record<string, { s1: number; s2: number; s3: number; s4: number; s5: number }>>({});
  const [ujianDraft, setUjianDraft] = useState<Record<string, number>>({});
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [resettingPassword, setResettingPassword] = useState<boolean>(false);

  const fileStudentRef = useRef<HTMLInputElement>(null);
  const fileSubjectRef = useRef<HTMLInputElement>(null);
  const fileRaporRef = useRef<HTMLInputElement>(null);
  const fileUjianRef = useRef<HTMLInputElement>(null);

  const activeSubjects = useMemo(() => subjects.filter((item) => item.aktif).sort((a, b) => a.urutan - b.urutan), [subjects]);

  const diplomaRows = useMemo<DiplomaRow[]>(() => {
    if (!settings) return [];
    return students
      .slice()
      .sort((a, b) => a.nama.localeCompare(b.nama))
      .map((student) => {
        const perMapel = activeSubjects.map((subject) => {
          const rapor = reportGrades.find((grade) => grade.student_id === student.id && grade.subject_id === subject.id);
          const ujian = examGrades.find((grade) => grade.student_id === student.id && grade.subject_id === subject.id);
          const raporAvg = rapor ? (rapor.s1 + rapor.s2 + rapor.s3 + rapor.s4 + rapor.s5) / 5 : 0;
          const ujianNilai = ujian?.nilai_ujian ?? 0;
          const finalScore = (raporAvg * settings.persen_rapor) / 100 + (ujianNilai * settings.persen_ujian) / 100;
          return { subject, nilai: Number(finalScore.toFixed(2)) };
        });
        const total = Number(perMapel.reduce((sum, item) => sum + item.nilai, 0).toFixed(2));
        const rata = perMapel.length > 0 ? Number((total / perMapel.length).toFixed(2)) : 0;
        return { student, perMapel, total, rata };
      });
  }, [activeSubjects, examGrades, reportGrades, settings, students]);

  async function loadAllData(ownerId: string): Promise<void> {
    if (supabase) {
      const [studentsRes, subjectsRes, reportRes, examRes, settingsRes] = await Promise.all([
        supabase.from(tableNames.students).select("*").eq("owner_id", ownerId).order("nama", { ascending: true }),
        supabase.from(tableNames.subjects).select("*").eq("owner_id", ownerId).order("urutan", { ascending: true }),
        supabase.from(tableNames.report).select("*").eq("owner_id", ownerId),
        supabase.from(tableNames.exam).select("*").eq("owner_id", ownerId),
        supabase.from(tableNames.settings).select("*").eq("owner_id", ownerId).maybeSingle(),
      ]);

      if (studentsRes.error) throw new Error(studentsRes.error.message);
      if (subjectsRes.error) throw new Error(subjectsRes.error.message);
      if (reportRes.error) throw new Error(reportRes.error.message);
      if (examRes.error) throw new Error(examRes.error.message);
      if (settingsRes.error) throw new Error(settingsRes.error.message);

      setStudents((studentsRes.data ?? []) as Student[]);
      setSubjects((subjectsRes.data ?? []) as Subject[]);
      setReportGrades((reportRes.data ?? []) as ReportGrade[]);
      setExamGrades((examRes.data ?? []) as ExamGrade[]);

      const dbSettings = settingsRes.data as (Partial<AppSettings> & Record<string, unknown>) | null;
      if (!dbSettings) {
        const setting = defaultSettings(ownerId);
        const { error } = await supabase.from(tableNames.settings).upsert(setting, { onConflict: "owner_id" });
        if (error) throw new Error(error.message);
        setSettings(setting);
      } else {
        setSettings(normalizeSettings(dbSettings, ownerId));
      }
      return;
    }

    const payload = loadLocalPayload(ownerId);
    setStudents(payload.students);
    setSubjects(payload.subjects);
    setReportGrades(payload.reportGrades);
    setExamGrades(payload.examGrades);
    setSettings(normalizeSettings((payload.settings ?? defaultSettings(ownerId)) as Record<string, unknown>, ownerId));
  }

  useEffect(() => {
    void (async () => {
      try {
        const active = await getCurrentSession();
        if (active) {
          setSession(active);
          await loadAllData(active.id);
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Gagal memuat sesi");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (session?.mode === "local") {
      localStorage.setItem("ijazah_active_user", JSON.stringify(session));
    }
  }, [session]);

  useEffect(() => {
    if (!session || session.mode !== "local" || !settings) return;
    saveLocalPayload(session.id, { students, subjects, reportGrades, examGrades, settings });
  }, [session, students, subjects, reportGrades, examGrades, settings]);

  useEffect(() => {
    if (activeSubjects.length > 0 && !selectedRaporSubject) {
      setSelectedRaporSubject(activeSubjects[0].id);
    }
    if (activeSubjects.length > 0 && !selectedUjianSubject) {
      setSelectedUjianSubject(activeSubjects[0].id);
    }
  }, [activeSubjects, selectedRaporSubject, selectedUjianSubject]);

  useEffect(() => {
    if (!selectedRaporSubject) return;
    const next: Record<string, { s1: number; s2: number; s3: number; s4: number; s5: number }> = {};
    students.forEach((student) => {
      const found = reportGrades.find((row) => row.student_id === student.id && row.subject_id === selectedRaporSubject);
      next[student.id] = {
        s1: found?.s1 ?? 0,
        s2: found?.s2 ?? 0,
        s3: found?.s3 ?? 0,
        s4: found?.s4 ?? 0,
        s5: found?.s5 ?? 0,
      };
    });
    setRaporDraft(next);
  }, [selectedRaporSubject, students, reportGrades]);

  useEffect(() => {
    if (!selectedUjianSubject) return;
    const next: Record<string, number> = {};
    students.forEach((student) => {
      const found = examGrades.find((row) => row.student_id === student.id && row.subject_id === selectedUjianSubject);
      next[student.id] = found?.nilai_ujian ?? 0;
    });
    setUjianDraft(next);
  }, [selectedUjianSubject, students, examGrades]);

  function generateCaptcha(): void {
    setCaptchaA(Math.floor(Math.random() * 9) + 1);
    setCaptchaB(Math.floor(Math.random() * 9) + 1);
    setCaptchaAnswer("");
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage("");
    if (Number(captchaAnswer) !== captchaA + captchaB) {
      setErrorMessage("Jawaban captcha tidak benar");
      generateCaptcha();
      return;
    }
    setSubmitting(true);
    try {
      const nextSession = await loginWithPassword(loginEmail.trim(), loginPassword);
      setSession(nextSession);
      await loadAllData(nextSession.id);
      setPage("dashboard");
      generateCaptcha();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Login gagal");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(): Promise<void> {
    setErrorMessage("");
    if (loginPassword.length < 8) {
      setErrorMessage("Password minimal 8 karakter");
      return;
    }
    setSubmitting(true);
    try {
      await registerWithPassword(loginEmail.trim(), loginPassword);
      setIsRegisterMode(false);
      setErrorMessage("Registrasi berhasil. Silakan login.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Registrasi gagal");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout(): Promise<void> {
    await logoutSession();
    setSession(null);
    setStudents([]);
    setSubjects([]);
    setReportGrades([]);
    setExamGrades([]);
    setSettings(null);
    setPage("dashboard");
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!session) return;
    setErrorMessage("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage("Semua field reset password wajib diisi");
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage("Password baru minimal 8 karakter");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Konfirmasi password baru tidak sama");
      return;
    }

    setResettingPassword(true);
    try {
      if (supabase) {
        const { error: reauthError } = await supabase.auth.signInWithPassword({
          email: session.email,
          password: currentPassword,
        });
        if (reauthError) {
          setErrorMessage("Password lama tidak valid");
          return;
        }

        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          setErrorMessage(error.message);
          return;
        }
      } else {
        ensureLocalUsers();
        const usersRaw = localStorage.getItem("ijazah_users") ?? "[]";
        const users = JSON.parse(usersRaw) as Array<{ id: string; email: string; password: string }>;
        const userIndex = users.findIndex((user) => user.id === session.id);
        if (userIndex === -1) {
          setErrorMessage("User tidak ditemukan");
          return;
        }
        if (users[userIndex].password !== currentPassword) {
          setErrorMessage("Password lama tidak valid");
          return;
        }
        users[userIndex].password = newPassword;
        localStorage.setItem("ijazah_users", JSON.stringify(users));
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrorMessage("Password pengguna berhasil diperbarui");
    } finally {
      setResettingPassword(false);
    }
  }

  async function saveStudent(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!session) return;
    const payload: Student = {
      ...studentForm,
      id: studentForm.id || uid("stu"),
      owner_id: session.id,
    };
    if (supabase) {
      const { data, error } = await supabase
        .from(tableNames.students)
        .upsert(payload)
        .select()
        .single();
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      setStudents((prev) => {
        const filtered = prev.filter((item) => item.id !== payload.id);
        return [...filtered, data as Student].sort((a, b) => a.nama.localeCompare(b.nama));
      });
    } else {
      setStudents((prev) => {
        const filtered = prev.filter((item) => item.id !== payload.id);
        return [...filtered, payload].sort((a, b) => a.nama.localeCompare(b.nama));
      });
    }
    setStudentForm({ id: "", nisn: "", nama: "", kelas: "", tahun_ajaran: settings?.tahun_pelajaran ?? "", status: "aktif" });
  }

  async function deleteStudent(id: string): Promise<void> {
    if (!session) return;
    if (supabase) {
      const { error } = await supabase.from(tableNames.students).delete().eq("owner_id", session.id).eq("id", id);
      if (error) {
        setErrorMessage(error.message);
        return;
      }
    }
    setStudents((prev) => prev.filter((item) => item.id !== id));
    setReportGrades((prev) => prev.filter((item) => item.student_id !== id));
    setExamGrades((prev) => prev.filter((item) => item.student_id !== id));
  }

  async function saveSubject(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!session) return;
    const payload: Subject = {
      ...subjectForm,
      id: subjectForm.id || uid("sub"),
      owner_id: session.id,
      urutan: toSafeOrder(subjectForm.urutan, 1),
    };
    if (supabase) {
      const { data, error } = await supabase
        .from(tableNames.subjects)
        .upsert(payload)
        .select()
        .single();
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      setSubjects((prev) => {
        const filtered = prev.filter((item) => item.id !== payload.id);
        return [...filtered, data as Subject].sort((a, b) => a.urutan - b.urutan);
      });
    } else {
      setSubjects((prev) => {
        const filtered = prev.filter((item) => item.id !== payload.id);
        return [...filtered, payload].sort((a, b) => a.urutan - b.urutan);
      });
    }
    setSubjectForm({ id: "", kode_mapel: "", nama_mapel: "", kelompok: "Umum", urutan: subjects.length + 1, aktif: true });
  }

  async function deleteSubject(id: string): Promise<void> {
    if (!session) return;
    if (supabase) {
      const { error } = await supabase.from(tableNames.subjects).delete().eq("owner_id", session.id).eq("id", id);
      if (error) {
        setErrorMessage(error.message);
        return;
      }
    }
    setSubjects((prev) => prev.filter((item) => item.id !== id));
    setReportGrades((prev) => prev.filter((item) => item.subject_id !== id));
    setExamGrades((prev) => prev.filter((item) => item.subject_id !== id));
  }

  async function saveSettingsForm(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!session || !settings) return;
    if (settings.persen_rapor + settings.persen_ujian !== 100) {
      setErrorMessage("Total bobot rapor dan ujian harus 100%");
      return;
    }
    if (supabase) {
      const { error } = await supabase.from(tableNames.settings).upsert(settings, { onConflict: "owner_id" });
      if (error) {
        setErrorMessage(error.message);
        return;
      }
    }
    setErrorMessage("Pengaturan berhasil disimpan");
  }

  async function saveRaporMassal(): Promise<void> {
    if (!session || !selectedRaporSubject) return;
    const payload = students.map((student) => {
      const draft = raporDraft[student.id] ?? { s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 };
      const existed = reportGrades.find((row) => row.student_id === student.id && row.subject_id === selectedRaporSubject);
      return {
        id: existed?.id ?? uid("rapor"),
        owner_id: session.id,
        student_id: student.id,
        subject_id: selectedRaporSubject,
        s1: draft.s1,
        s2: draft.s2,
        s3: draft.s3,
        s4: draft.s4,
        s5: draft.s5,
      } as ReportGrade;
    });

    if (supabase) {
      const { data, error } = await supabase
        .from(tableNames.report)
        .upsert(payload, { onConflict: "owner_id,student_id,subject_id" })
        .select();
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      const rows = data as ReportGrade[];
      setReportGrades((prev) => {
        const other = prev.filter((item) => item.subject_id !== selectedRaporSubject);
        return [...other, ...rows];
      });
    } else {
      setReportGrades((prev) => {
        const other = prev.filter((item) => item.subject_id !== selectedRaporSubject);
        return [...other, ...payload];
      });
    }
    setErrorMessage("Nilai rapor berhasil disimpan");
  }

  async function saveUjianMassal(): Promise<void> {
    if (!session || !selectedUjianSubject) return;
    const payload = students.map((student) => {
      const existed = examGrades.find((row) => row.student_id === student.id && row.subject_id === selectedUjianSubject);
      return {
        id: existed?.id ?? uid("ujian"),
        owner_id: session.id,
        student_id: student.id,
        subject_id: selectedUjianSubject,
        nilai_ujian: ujianDraft[student.id] ?? 0,
      } as ExamGrade;
    });

    if (supabase) {
      const { data, error } = await supabase
        .from(tableNames.exam)
        .upsert(payload, { onConflict: "owner_id,student_id,subject_id" })
        .select();
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      const rows = data as ExamGrade[];
      setExamGrades((prev) => {
        const other = prev.filter((item) => item.subject_id !== selectedUjianSubject);
        return [...other, ...rows];
      });
    } else {
      setExamGrades((prev) => {
        const other = prev.filter((item) => item.subject_id !== selectedUjianSubject);
        return [...other, ...payload];
      });
    }
    setErrorMessage("Nilai ujian berhasil disimpan");
  }

  function downloadStudentTemplate(): void {
    downloadCsv("template-siswa.csv", [["nisn", "nama", "kelas", "tahun_ajaran", "status"], ["1234567890", "Nama Siswa", "6A", "2025/2026", "aktif"]]);
  }

  function downloadSubjectTemplate(): void {
    downloadCsv("template-mapel.csv", [["kode_mapel", "nama_mapel", "kelompok", "urutan", "aktif"], ["MTK", "Matematika", "Umum", "1", "true"]]);
  }

  function downloadTemplateRaporExcel(): void {
    const subjectName = activeSubjects.find((item) => item.id === selectedRaporSubject)?.nama_mapel ?? "Mapel";
    const rows = [
      ["nisn", "nama", "s1", "s2", "s3", "s4", "s5", "mapel"],
      ["1234567890", "Nama Siswa", 80, 82, 84, 86, 88, subjectName],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Template Rapor");
    XLSX.writeFile(wb, "template-nilai-rapor.xlsx");
  }

  function downloadTemplateUjianExcel(): void {
    const subjectName = activeSubjects.find((item) => item.id === selectedUjianSubject)?.nama_mapel ?? "Mapel";
    const rows = [
      ["nisn", "nama", "nilai_ujian", "mapel"],
      ["1234567890", "Nama Siswa", 88, subjectName],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Template Ujian");
    XLSX.writeFile(wb, "template-nilai-ujian.xlsx");
  }

  async function parseExcelRows(file: File): Promise<Record<string, unknown>[]> {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
  }

  async function handleStudentImport(event: FormEvent<HTMLInputElement>): Promise<void> {
    const target = event.currentTarget;
    const file = target.files?.[0];
    if (!file || !session) return;
    const content = await file.text();
    const rows = parseCsv(content);
    const imports = rows.slice(1).map((row) => ({
      id: uid("stu"),
      owner_id: session.id,
      nisn: row[0] ?? "",
      nama: row[1] ?? "",
      kelas: row[2] ?? "",
      tahun_ajaran: row[3] ?? settings?.tahun_pelajaran ?? "",
      status: row[4] === "lulus" ? "lulus" : "aktif",
    })) as Student[];

    if (supabase) {
      const { data, error } = await supabase.from(tableNames.students).upsert(imports).select();
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      setStudents((data as Student[]).sort((a, b) => a.nama.localeCompare(b.nama)));
    } else {
      setStudents((prev) => [...prev, ...imports].sort((a, b) => a.nama.localeCompare(b.nama)));
    }
    target.value = "";
  }

  async function handleSubjectImport(event: FormEvent<HTMLInputElement>): Promise<void> {
    const target = event.currentTarget;
    const file = target.files?.[0];
    if (!file || !session) return;
    const content = await file.text();
    const rows = parseCsv(content);
    const imports = rows.slice(1).map((row, index) => {
      const fallbackOrder = subjects.length + index + 1;
      return {
        id: uid("sub"),
        owner_id: session.id,
        kode_mapel: row[0] ?? "",
        nama_mapel: row[1] ?? "",
        kelompok: row[2] ?? "Umum",
        urutan: toSafeOrder(row[3], fallbackOrder),
        aktif: (row[4] ?? "true").toLowerCase() !== "false",
      };
    }) as Subject[];

    if (supabase) {
      const { data, error } = await supabase.from(tableNames.subjects).upsert(imports).select();
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      setSubjects((data as Subject[]).sort((a, b) => a.urutan - b.urutan));
    } else {
      setSubjects((prev) => [...prev, ...imports].sort((a, b) => a.urutan - b.urutan));
    }
    target.value = "";
  }

  async function handleRaporImportExcel(event: FormEvent<HTMLInputElement>): Promise<void> {
    const target = event.currentTarget;
    const file = target.files?.[0];
    if (!file || !session || !selectedRaporSubject) return;

    const rows = await parseExcelRows(file);
    const payload: ReportGrade[] = rows
      .map((row) => {
        const nisn = String(row.nisn ?? "").trim();
        const student = students.find((item) => item.nisn === nisn);
        if (!student) return null;
        const existed = reportGrades.find((item) => item.student_id === student.id && item.subject_id === selectedRaporSubject);
        return {
          id: existed?.id ?? uid("rapor"),
          owner_id: session.id,
          student_id: student.id,
          subject_id: selectedRaporSubject,
          s1: Number(row.s1 ?? 0),
          s2: Number(row.s2 ?? 0),
          s3: Number(row.s3 ?? 0),
          s4: Number(row.s4 ?? 0),
          s5: Number(row.s5 ?? 0),
        };
      })
      .filter((item): item is ReportGrade => item !== null);

    if (payload.length === 0) {
      setErrorMessage("Tidak ada data rapor valid dari file Excel");
      target.value = "";
      return;
    }

    if (supabase) {
      const { data, error } = await supabase
        .from(tableNames.report)
        .upsert(payload, { onConflict: "owner_id,student_id,subject_id" })
        .select();
      if (error) {
        setErrorMessage(error.message);
        target.value = "";
        return;
      }
      const rowsSaved = data as ReportGrade[];
      setReportGrades((prev) => {
        const other = prev.filter((item) => item.subject_id !== selectedRaporSubject);
        return [...other, ...rowsSaved];
      });
    } else {
      setReportGrades((prev) => {
        const other = prev.filter((item) => item.subject_id !== selectedRaporSubject);
        return [...other, ...payload];
      });
    }

    setErrorMessage("Import nilai rapor berhasil");
    target.value = "";
  }

  async function handleUjianImportExcel(event: FormEvent<HTMLInputElement>): Promise<void> {
    const target = event.currentTarget;
    const file = target.files?.[0];
    if (!file || !session || !selectedUjianSubject) return;

    const rows = await parseExcelRows(file);
    const payload: ExamGrade[] = rows
      .map((row) => {
        const nisn = String(row.nisn ?? "").trim();
        const student = students.find((item) => item.nisn === nisn);
        if (!student) return null;
        const existed = examGrades.find((item) => item.student_id === student.id && item.subject_id === selectedUjianSubject);
        return {
          id: existed?.id ?? uid("ujian"),
          owner_id: session.id,
          student_id: student.id,
          subject_id: selectedUjianSubject,
          nilai_ujian: Number(row.nilai_ujian ?? 0),
        };
      })
      .filter((item): item is ExamGrade => item !== null);

    if (payload.length === 0) {
      setErrorMessage("Tidak ada data ujian valid dari file Excel");
      target.value = "";
      return;
    }

    if (supabase) {
      const { data, error } = await supabase
        .from(tableNames.exam)
        .upsert(payload, { onConflict: "owner_id,student_id,subject_id" })
        .select();
      if (error) {
        setErrorMessage(error.message);
        target.value = "";
        return;
      }
      const rowsSaved = data as ExamGrade[];
      setExamGrades((prev) => {
        const other = prev.filter((item) => item.subject_id !== selectedUjianSubject);
        return [...other, ...rowsSaved];
      });
    } else {
      setExamGrades((prev) => {
        const other = prev.filter((item) => item.subject_id !== selectedUjianSubject);
        return [...other, ...payload];
      });
    }

    setErrorMessage("Import nilai ujian berhasil");
    target.value = "";
  }

  function exportIjazahCsv(): void {
    const header = ["nisn", "nama", ...activeSubjects.map((subject) => subject.nama_mapel), "total", "rata_rata"];
    const body = diplomaRows.map((row) => [
      row.student.nisn,
      row.student.nama,
      ...row.perMapel.map((mapel) => String(mapel.nilai)),
      String(row.total),
      String(row.rata),
    ]);
    downloadCsv("rekap-nilai-ijazah.csv", [header, ...body]);
  }

  const pageTitleMap: Record<PageKey, string> = {
    dashboard: "Dashboard",
    students: "Data Siswa",
    subjects: "Mata Pelajaran",
    settings: "Pengaturan Sistem",
    rapor: "Input Nilai Rapor",
    ujian: "Input Nilai Ujian",
    ijazah: "Proses Ijazah",
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 text-sm font-semibold text-emerald-700">
        Memuat aplikasi...
      </div>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-zinc-100 p-6 sm:p-10">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-lg shadow-zinc-300/30 ring-1 ring-zinc-200"
        >
          <div className="mb-6 text-center">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/8/82/Seal_of_the_Ministry_of_Religious_Affairs_of_the_Republic_of_Indonesia.svg"
              alt="Logo"
              className="mx-auto mb-3 h-16 w-16 object-contain"
            />
            <h1 className="text-2xl font-bold tracking-tight text-emerald-800">Sistem Nilai Ijazah</h1>
            <p className="text-sm text-zinc-500">Aplikasi Pengolah Nilai Ijazah Multi User</p>
          </div>

          <form className="space-y-3" onSubmit={handleLogin}>
            <input
              className={fieldClassName}
              placeholder={supabase ? "Email" : "Username"}
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              required
            />
            <input
              className={fieldClassName}
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              required
            />
            <label className="block text-xs font-semibold text-emerald-700">Berapa hasil {captchaA} + {captchaB}?</label>
            <input
              className={fieldClassName}
              value={captchaAnswer}
              onChange={(event) => setCaptchaAnswer(event.target.value)}
              required
            />
            {errorMessage && <p className="text-xs text-rose-600">{errorMessage}</p>}
            <button type="submit" className={`w-full ${primaryButtonClassName}`} disabled={submitting || isRegisterMode}>
              {submitting ? "Memproses..." : "MASUK APLIKASI"}
            </button>
          </form>

          <div className="mt-4 space-y-2 text-center text-xs">
            <button
              onClick={() => {
                setIsRegisterMode((value) => !value);
                setErrorMessage("");
              }}
              className="font-semibold text-emerald-700"
            >
              {isRegisterMode ? "Kembali ke login" : "Belum punya akun? Registrasi"}
            </button>
            {isRegisterMode && (
              <button
                onClick={() => void handleRegister()}
                className="block w-full rounded-full border border-emerald-700 px-3 py-2 font-semibold text-emerald-700"
                disabled={submitting}
              >
                Buat Akun Baru
              </button>
            )}
            {!supabase && <p className="text-zinc-500">© Agus Arifien @min1cms</p>}
          </div>
        </motion.section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-800">
      <input ref={fileStudentRef} type="file" className="hidden" accept=".csv" onChange={(event) => void handleStudentImport(event)} />
      <input ref={fileSubjectRef} type="file" className="hidden" accept=".csv" onChange={(event) => void handleSubjectImport(event)} />
      <input ref={fileRaporRef} type="file" className="hidden" accept=".xlsx,.xls" onChange={(event) => void handleRaporImportExcel(event)} />
      <input ref={fileUjianRef} type="file" className="hidden" accept=".xlsx,.xls" onChange={(event) => void handleUjianImportExcel(event)} />

      <AnimatePresence>
        {mobileSidebar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/35 lg:hidden"
            onClick={() => setMobileSidebar(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-white shadow-[2px_0_24px_rgba(0,0,0,0.06)] transition-transform duration-300 lg:translate-x-0 ${
          mobileSidebar ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b p-5 text-center">
          <img src={settings?.logo_url} alt="Logo" className="mx-auto mb-2 h-12 w-12 object-contain" />
          <p className="text-sm font-bold text-emerald-800">E-IJAZAH</p>
          <p className="text-xs text-zinc-500">Kemenag RI</p>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 text-sm">
          {["Menu Utama", "Master Data", "Nilai & Proses"].map((section) => (
            <div key={section} className="mb-4">
              <p className="px-4 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">{section}</p>
              {navItems
                .filter((item) => item.section === section)
                .map((item) => {
                  const Icon = item.icon;
                  const active = page === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        setPage(item.key);
                        setMobileSidebar(false);
                      }}
                      className={`mb-1 flex w-full items-center gap-3 rounded-r-full px-4 py-2.5 text-left font-semibold transition ${active ? "bg-emerald-700 text-white shadow-sm" : "text-zinc-600 hover:bg-emerald-50 hover:text-emerald-800"}`}
                    >
                      <Icon size={16} />
                      {item.label}
                    </button>
                  );
                })}
            </div>
          ))}
        </nav>
        <div className="border-t p-4">
          <p className="truncate text-sm font-semibold">{session.email}</p>
          <p className="mb-3 text-xs text-zinc-500">{session.mode === "supabase" ? "Cloud Multi User" : "Local Mode"}</p>
          <button onClick={() => void handleLogout()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50">
            <LogOut size={15} />
            Keluar
          </button>
        </div>
      </aside>

      <section className="min-h-screen lg:ml-64">
        <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur lg:px-6">
          <div className="flex items-center justify-between">
            <button className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm lg:hidden" onClick={() => setMobileSidebar(true)}>
              <Menu size={17} />
            </button>
            <h2 className="text-sm font-bold text-emerald-800 sm:text-base">{settings?.nama_madrasah ?? "Sistem Ijazah"}</h2>
            <p className="text-xs text-zinc-500">Tahun {settings?.tahun_pelajaran}</p>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="space-y-4 p-4 lg:p-6"
          >
            {errorMessage && <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-700">{errorMessage}</p>}

            {page === "dashboard" && (
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <GraduationCap size={20} className="text-emerald-700" />
                  <h3 className="text-xl font-bold">Dashboard</h3>
                </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border bg-white p-4">
                  <p className="text-xs text-zinc-500">Total Siswa</p>
                  <p className="text-2xl font-bold text-emerald-700">{students.length}</p>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <p className="text-xs text-zinc-500">Mata Pelajaran Aktif</p>
                  <p className="text-2xl font-bold text-emerald-700">{activeSubjects.length}</p>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <p className="text-xs text-zinc-500">Rata Nilai Ijazah</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {diplomaRows.length > 0 ? (diplomaRows.reduce((sum, row) => sum + row.rata, 0) / diplomaRows.length).toFixed(2) : "0.00"}
                  </p>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <p className="text-xs text-zinc-500">Mode Database</p>
                  <p className="text-sm font-bold text-emerald-700">{session.mode === "supabase" ? "Supabase" : "LocalStorage"}</p>
                </div>
              </div>
              </section>
            )}

            {page === "students" && (
              <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users size={20} className="text-emerald-700" />
                  <h3 className="text-xl font-bold">Data Siswa</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:text-emerald-700" onClick={downloadStudentTemplate}>Template</button>
                  <button className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:text-emerald-700" onClick={() => fileStudentRef.current?.click()}>Import CSV</button>
                </div>
              </div>

              <form onSubmit={saveStudent} className="grid gap-2 rounded-xl border bg-white p-3 md:grid-cols-6">
                <input value={studentForm.nisn} onChange={(event) => setStudentForm({ ...studentForm, nisn: event.target.value })} placeholder="NISN" className={fieldClassName} required />
                <input value={studentForm.nama} onChange={(event) => setStudentForm({ ...studentForm, nama: event.target.value })} placeholder="Nama Siswa" className={fieldClassName} required />
                <input value={studentForm.kelas} onChange={(event) => setStudentForm({ ...studentForm, kelas: event.target.value })} placeholder="Kelas" className={fieldClassName} required />
                <input value={studentForm.tahun_ajaran} onChange={(event) => setStudentForm({ ...studentForm, tahun_ajaran: event.target.value })} placeholder="Tahun" className={fieldClassName} required />
                <select value={studentForm.status} onChange={(event) => setStudentForm({ ...studentForm, status: event.target.value as "aktif" | "lulus" })} className={fieldClassName}>
                  <option value="aktif">Aktif</option>
                  <option value="lulus">Lulus</option>
                </select>
                <button className={primaryButtonClassName}>{studentForm.id ? "Update" : "Tambah"}</button>
              </form>

              <div className="overflow-x-auto rounded-xl border bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="px-3 py-2 text-left">NISN</th>
                      <th className="px-3 py-2 text-left">Nama</th>
                      <th className="px-3 py-2 text-left">Kelas</th>
                      <th className="px-3 py-2 text-left">Tahun</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} className="border-t">
                        <td className="px-3 py-2">{student.nisn}</td>
                        <td className="px-3 py-2">{student.nama}</td>
                        <td className="px-3 py-2">{student.kelas}</td>
                        <td className="px-3 py-2">{student.tahun_ajaran}</td>
                        <td className="px-3 py-2 capitalize">{student.status}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            className="mr-2 text-xs font-semibold text-emerald-700"
                            onClick={() =>
                              setStudentForm({
                                id: student.id,
                                nisn: student.nisn,
                                nama: student.nama,
                                kelas: student.kelas,
                                tahun_ajaran: student.tahun_ajaran,
                                status: student.status,
                              })
                            }
                          >
                            Edit
                          </button>
                          <button className="text-xs font-semibold text-rose-600" onClick={() => void deleteStudent(student.id)}>
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </section>
            )}

            {page === "subjects" && (
              <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen size={20} className="text-emerald-700" />
                  <h3 className="text-xl font-bold">Mata Pelajaran</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:text-emerald-700" onClick={downloadSubjectTemplate}>Template</button>
                  <button className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:text-emerald-700" onClick={() => fileSubjectRef.current?.click()}>Import CSV</button>
                </div>
              </div>
              <form onSubmit={saveSubject} className="grid gap-2 rounded-xl border bg-white p-3 md:grid-cols-6">
                <input value={subjectForm.kode_mapel} onChange={(event) => setSubjectForm({ ...subjectForm, kode_mapel: event.target.value })} placeholder="Kode" className={fieldClassName} required />
                <input value={subjectForm.nama_mapel} onChange={(event) => setSubjectForm({ ...subjectForm, nama_mapel: event.target.value })} placeholder="Nama Mapel" className={fieldClassName} required />
                <input value={subjectForm.kelompok} onChange={(event) => setSubjectForm({ ...subjectForm, kelompok: event.target.value })} placeholder="Kelompok" className={fieldClassName} required />
                <input type="number" value={subjectForm.urutan} onChange={(event) => setSubjectForm({ ...subjectForm, urutan: Number(event.target.value) })} placeholder="Urutan" className={fieldClassName} required />
                <select value={String(subjectForm.aktif)} onChange={(event) => setSubjectForm({ ...subjectForm, aktif: event.target.value === "true" })} className={fieldClassName}>
                  <option value="true">Aktif</option>
                  <option value="false">Nonaktif</option>
                </select>
                <button className={primaryButtonClassName}>{subjectForm.id ? "Update" : "Tambah"}</button>
              </form>

              <div className="overflow-x-auto rounded-xl border bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Kode</th>
                      <th className="px-3 py-2 text-left">Nama</th>
                      <th className="px-3 py-2 text-left">Kelompok</th>
                      <th className="px-3 py-2 text-left">Urutan</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((subject) => (
                      <tr key={subject.id} className="border-t">
                        <td className="px-3 py-2">{subject.kode_mapel}</td>
                        <td className="px-3 py-2">{subject.nama_mapel}</td>
                        <td className="px-3 py-2">{subject.kelompok}</td>
                        <td className="px-3 py-2">{subject.urutan}</td>
                        <td className="px-3 py-2">{subject.aktif ? "Aktif" : "Nonaktif"}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            className="mr-2 text-xs font-semibold text-emerald-700"
                            onClick={() =>
                              setSubjectForm({
                                id: subject.id,
                                kode_mapel: subject.kode_mapel,
                                nama_mapel: subject.nama_mapel,
                                kelompok: subject.kelompok,
                                urutan: subject.urutan,
                                aktif: subject.aktif,
                              })
                            }
                          >
                            Edit
                          </button>
                          <button className="text-xs font-semibold text-rose-600" onClick={() => void deleteSubject(subject.id)}>
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </section>
            )}

            {page === "settings" && settings && (
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Settings size={20} className="text-emerald-700" />
                  <h3 className="text-xl font-bold">Pengaturan Sistem</h3>
                </div>
                <form onSubmit={saveSettingsForm} className="space-y-4 rounded-xl border bg-white p-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2 rounded-xl border border-zinc-200 p-3">
                      <div className="flex items-center gap-2">
                        <Building2 size={17} className="text-emerald-700" />
                        <h4 className="text-sm font-bold text-emerald-800">Profil Madrasah</h4>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-semibold text-zinc-600">Nama Madrasah:</label>
                          <input value={settings.nama_madrasah} onChange={(event) => setSettings({ ...settings, nama_madrasah: event.target.value })} className={fieldClassName} required />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-semibold text-zinc-600">Alamat Madrasah:</label>
                          <input value={settings.alamat_madrasah} onChange={(event) => setSettings({ ...settings, alamat_madrasah: event.target.value })} className={fieldClassName} required />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-zinc-600">Kabupaten/ Kota:</label>
                          <input value={settings.kabupaten_kota} onChange={(event) => setSettings({ ...settings, kabupaten_kota: event.target.value })} className={fieldClassName} required />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-zinc-600">Tahun Pelajaran:</label>
                          <input value={settings.tahun_pelajaran} onChange={(event) => setSettings({ ...settings, tahun_pelajaran: event.target.value })} className={fieldClassName} required />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-semibold text-zinc-600">Nama Kepala Madrasah:</label>
                          <input value={settings.nama_kepala_madrasah} onChange={(event) => setSettings({ ...settings, nama_kepala_madrasah: event.target.value })} className={fieldClassName} required />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-zinc-600">NIP Kepala:</label>
                          <input value={settings.nip_kepala} onChange={(event) => setSettings({ ...settings, nip_kepala: event.target.value })} className={fieldClassName} required />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-zinc-600">Url logo:</label>
                          <input value={settings.logo_url} onChange={(event) => setSettings({ ...settings, logo_url: event.target.value })} className={fieldClassName} required />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-xl border border-zinc-200 p-3">
                      <div className="flex items-center gap-2">
                        <BadgePercent size={17} className="text-emerald-700" />
                        <h4 className="text-sm font-bold text-emerald-800">Bobot Nilai Kalkulasi (%)</h4>
                      </div>
                      <p className="text-xs font-semibold text-amber-700">Total bobot wajib 100%.</p>
                      <div className="grid gap-2">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-zinc-600">Bobot Rapor (Sem 1-5) =%</label>
                          <input type="number" value={settings.persen_rapor} onChange={(event) => setSettings({ ...settings, persen_rapor: Number(event.target.value) })} className={fieldClassName} required />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-zinc-600">Bobot Ujian Akhir= (%)</label>
                          <input type="number" value={settings.persen_ujian} onChange={(event) => setSettings({ ...settings, persen_ujian: Number(event.target.value) })} className={fieldClassName} required />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button className={primaryButtonClassName}>Simpan Pengaturan</button>
                </form>

                <form onSubmit={(event) => void handleResetPassword(event)} className="space-y-3 rounded-xl border bg-white p-4">
                  <div className="flex items-center gap-2">
                    <KeyRound size={18} className="text-emerald-700" />
                    <h4 className="text-sm font-bold text-emerald-800">Reset Password User Pengguna</h4>
                  </div>
                  <div className="grid gap-2 md:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-600">Password Lama:</label>
                      <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={fieldClassName} required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-600">Password Baru:</label>
                      <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={fieldClassName} required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-600">Konfirmasi Password Baru:</label>
                      <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={fieldClassName} required />
                    </div>
                  </div>
                  <button className={primaryButtonClassName} disabled={resettingPassword}>
                    {resettingPassword ? "Memproses..." : "Reset Password"}
                  </button>
                </form>
              </section>
            )}

            {page === "rapor" && (
              <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xl font-bold">Input Nilai Rapor</h3>
                <div className="flex gap-2">
                  <select className={fieldClassName} value={selectedRaporSubject} onChange={(event) => setSelectedRaporSubject(event.target.value)}>
                    {activeSubjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>{subject.nama_mapel}</option>
                    ))}
                  </select>
                  <button className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:text-emerald-700" onClick={downloadTemplateRaporExcel}>
                    Template
                  </button>
                  <button className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:text-emerald-700" onClick={() => fileRaporRef.current?.click()}>
                    Import Excel
                  </button>
                  <button className={primaryButtonClassName} onClick={() => void saveRaporMassal()}>
                    Simpan
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="px-3 py-2 text-left">NISN</th>
                      <th className="px-3 py-2 text-left">Nama</th>
                      {["S1", "S2", "S3", "S4", "S5"].map((semester) => (
                        <th key={semester} className="px-3 py-2 text-center">{semester}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} className="border-t">
                        <td className="px-3 py-2">{student.nisn}</td>
                        <td className="px-3 py-2">{student.nama}</td>
                        {(["s1", "s2", "s3", "s4", "s5"] as const).map((semester) => (
                          <td key={semester} className="px-3 py-2 text-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={raporDraft[student.id]?.[semester] ?? 0}
                              onChange={(event) =>
                                setRaporDraft((prev) => ({
                                  ...prev,
                                  [student.id]: {
                                    ...(prev[student.id] ?? { s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 }),
                                    [semester]: Number(event.target.value),
                                  },
                                }))
                              }
                              className="w-16 rounded border px-1 py-1 text-center"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </section>
            )}

            {page === "ujian" && (
              <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xl font-bold">Input Nilai Ujian</h3>
                <div className="flex gap-2">
                  <select className={fieldClassName} value={selectedUjianSubject} onChange={(event) => setSelectedUjianSubject(event.target.value)}>
                    {activeSubjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>{subject.nama_mapel}</option>
                    ))}
                  </select>
                  <button className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:text-emerald-700" onClick={downloadTemplateUjianExcel}>
                    Template
                  </button>
                  <button className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:text-emerald-700" onClick={() => fileUjianRef.current?.click()}>
                    Import Excel
                  </button>
                  <button className={primaryButtonClassName} onClick={() => void saveUjianMassal()}>
                    Simpan
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="px-3 py-2 text-left">NISN</th>
                      <th className="px-3 py-2 text-left">Nama</th>
                      <th className="px-3 py-2 text-center">Nilai Ujian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} className="border-t">
                        <td className="px-3 py-2">{student.nisn}</td>
                        <td className="px-3 py-2">{student.nama}</td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={ujianDraft[student.id] ?? 0}
                            onChange={(event) => setUjianDraft((prev) => ({ ...prev, [student.id]: Number(event.target.value) }))}
                            className="w-20 rounded border px-1 py-1 text-center"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </section>
            )}

            {page === "ijazah" && (
              <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xl font-bold">Proses Ijazah</h3>
                <button className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:text-emerald-700" onClick={exportIjazahCsv}>
                  Export CSV
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="px-3 py-2 text-left">NISN</th>
                      <th className="px-3 py-2 text-left">Nama</th>
                      {activeSubjects.map((subject) => (
                        <th key={subject.id} className="px-3 py-2 text-center">{subject.kode_mapel}</th>
                      ))}
                      <th className="px-3 py-2 text-center">Total</th>
                      <th className="px-3 py-2 text-center">Rata-rata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diplomaRows.map((row) => (
                      <tr key={row.student.id} className="border-t">
                        <td className="px-3 py-2">{row.student.nisn}</td>
                        <td className="px-3 py-2">{row.student.nama}</td>
                        {row.perMapel.map((mapel) => (
                          <td key={mapel.subject.id} className="px-3 py-2 text-center">{mapel.nilai}</td>
                        ))}
                        <td className="px-3 py-2 text-center font-semibold">{row.total}</td>
                        <td className="px-3 py-2 text-center font-semibold">{row.rata}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </section>
            )}

            <p className="text-[11px] font-medium text-zinc-400">{pageTitleMap[page]} • Sistem Nilai Ijazah</p>
          </motion.div>
        </AnimatePresence>
      </section>
    </main>
  );
}
