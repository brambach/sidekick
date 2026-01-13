"use client";

export function ContactTeamButton() {
  const handleClick = () => {
    // Find the message form textarea
    const messageForm = document.querySelector("textarea[placeholder=\"Type a message...\"]");
    if (messageForm) {
      // Scroll to the message form
      messageForm.scrollIntoView({ behavior: "smooth", block: "center" });
      // Focus the textarea after a short delay to allow scroll to complete
      setTimeout(() => {
        (messageForm as HTMLTextAreaElement).focus();
      }, 500);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium shadow-sm"
    >
      Contact Team
    </button>
  );
}
