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
      className="w-full bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-md transition-colors text-sm font-medium"
    >
      Contact Team
    </button>
  );
}
