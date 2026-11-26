export default function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex justify-center items-center h-screen">
                <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
      <p className="text-gray-500 text-center mt-10">Chargement...</p>
    </div>
  );
}

