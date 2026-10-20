export default function GmailLogo({ className = 'h-6' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      {/* Logo officiel Google Gmail moderne M sans fond parasite */}
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6 shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Volet bleu gauche */}
        <path
          d="M2.25 6.75C2.25 5.50736 3.25736 4.5 4.5 4.5H5.75V15.5H2.25V6.75Z"
          fill="#4285F4"
        />
        {/* Volet vert droite */}
        <path
          d="M21.75 6.75C21.75 5.50736 20.7426 4.5 19.5 4.5H18.25V15.5H21.75V6.75Z"
          fill="#34A853"
        />
        {/* Rabats rouges supérieurs */}
        <path
          d="M5.75 4.5L12 9.25L18.25 4.5H19.5C20.1904 4.5 20.8154 4.81188 21.2338 5.30562L12 12.5L2.76624 5.30562C3.18464 4.81188 3.80964 4.5 4.5 4.5H5.75Z"
          fill="#EA4335"
        />
        {/* Volet jaune inférieur gauche */}
        <path
          d="M2.25 15.5H5.75V19.5H4.5C3.25736 19.5 2.25 18.4926 2.25 17.25V15.5Z"
          fill="#FBBC04"
        />
        {/* Volet vert inférieur droit */}
        <path
          d="M18.25 15.5H21.75V17.25C21.75 18.4926 20.7426 19.5 19.5 19.5H18.25V15.5Z"
          fill="#34A853"
        />
      </svg>

      <span
        className="text-[20px] font-normal tracking-[-0.02em] text-[#444746] dark:text-[#e8eaed]"
        style={{ fontFamily: "'Google Sans', Roboto, sans-serif" }}
      >
        Gmail
      </span>
    </div>
  );
}
