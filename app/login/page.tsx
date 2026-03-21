import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-brand-900 dark:text-brand-400">Tilsynsapp</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Plan &amp; Bygg – Byggesak</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
