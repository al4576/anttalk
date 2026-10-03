import React from "react";
import anteaterImage from "../anteater.png";

export default function AntMessage({ text, eaten = false }) {
  return (
    <div className={`ant-message ${eaten ? "is-eating" : ""}`}>
      <p className="message-writing">{text}</p>
      {eaten && <img className="anteater" src={anteaterImage} alt="Anteater eating the message" />}
    </div>
  );
}
