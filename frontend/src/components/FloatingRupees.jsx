import React from "react";

export default function FloatingRupees({ count = 14 }) {
  const items = Array.from({ length: count }, (_, i) => {
    const left = Math.random() * 100;
    const dur = 14 + Math.random() * 16;
    const delay = Math.random() * 12;
    const size = 22 + Math.random() * 30;
    const opacity = 0.10 + Math.random() * 0.25;
    return (
      <span
        key={i}
        className="rupee-float"
        style={{
          left: `${left}%`,
          fontSize: `${size}px`,
          animationDuration: `${dur}s`,
          animationDelay: `${delay}s`,
          color: `rgba(59,130,246,${opacity})`,
        }}
        aria-hidden
      >
        ₹
      </span>
    );
  });
  return <div data-testid="floating-rupees">{items}</div>;
}
