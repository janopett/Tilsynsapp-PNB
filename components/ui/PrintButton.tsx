"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
    >
      Skriv ut / PDF
    </button>
  );
}
