import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-brand-900">Tilsynsapp</h1>
          <p className="text-gray-500 mt-1">Plan &amp; Bygg – Byggesak</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
