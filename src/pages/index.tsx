export default function HomePage() {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">
        Welcome to the BattleTech Editor Dashboard!
      </h1>
      <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
        This is your central hub for managing BattleTech data. Use the sidebar navigation to explore different sections like Units, Equipment, and more.
      </p>
      <p className="text-gray-600 dark:text-gray-400">
        Select an option from the menu to get started. More features and content will be added soon.
      </p>
    </div>
  );
}
