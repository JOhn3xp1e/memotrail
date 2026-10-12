import { Heart, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export function ScrapbookCollage({ sample }: { sample: boolean }) {
  return (
    <div
      className={`scrapbook-collage ${!sample ? "collage-empty" : ""}`}
      aria-label={
        sample
          ? "A collage of sample travel photographs"
          : "A little space for your future memories"
      }
    >
      <svg
        className="collage-sun"
        viewBox="0 0 90 90"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="45"
          cy="45"
          r="16"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path
          d="M45 6v12M45 72v12M6 45h12M72 45h12M17 17l9 9M64 64l9 9M17 73l9-9M64 26l9-9"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
      <div className="collage-orbit" aria-hidden="true" />
      <Link
        to={sample ? "/timeline?category=travel" : "/add"}
        className="polaroid polaroid-back"
        aria-label={
          sample
            ? "Explore sample travel memories"
            : "Preview your first memory"
        }
      >
        <div className="polaroid-image">
          {sample ? (
            <img
              src="/photos/italian-summer.jpg"
              alt="Sample photograph of an Italian coastal village"
              fetchPriority="high"
            />
          ) : (
            <Heart size={35} />
          )}
        </div>
        <span className="handwritten">a summer to keep</span>
      </Link>
      <Link
        to={sample ? "/timeline?category=travel" : "/add"}
        className="polaroid polaroid-front"
        aria-label={
          sample ? "Explore sample lake memories" : "Make room for a new memory"
        }
      >
        <span className="washi-tape" aria-hidden="true" />
        <div className="polaroid-image">
          {sample ? (
            <img
              src="/photos/lake-weekend.jpg"
              alt="Sample photograph of a peaceful lake in the mountains"
              fetchPriority="high"
            />
          ) : (
            <Sparkles size={35} />
          )}
        </div>
        <span className="handwritten">
          {sample ? "where the heart wanders ♡" : "your story goes here ♡"}
        </span>
      </Link>
      <div className="collage-sticker" aria-hidden="true">
        <Heart size={21} strokeWidth={1.4} />
      </div>
      <span className="collage-caption handwritten">
        {sample
          ? "little moments, forever memories"
          : "the best is yet to come"}
      </span>
      {sample && <span className="collage-sample">SAMPLE PHOTOGRAPHY</span>}
    </div>
  );
}

export function MemoryJar({ empty = false }: { empty?: boolean }) {
  return (
    <svg
      className="jar-illustration"
      viewBox="0 0 130 145"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="jar-lines"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <path d="M0 0v8" stroke="#b7a5c4" strokeWidth="1" />
        </pattern>
      </defs>
      <ellipse cx="65" cy="132" rx="39" ry="5" fill="#55436c" opacity=".06" />
      <path
        d="M39 33v12C27 54 25 58 25 72v42c0 12 9 16 40 16s40-4 40-16V72c0-14-2-18-14-27V33"
        fill="#ffffff"
        fillOpacity=".45"
        stroke="#a89ab6"
        strokeWidth="1.5"
      />
      <path
        d="M32 77v33c0 8 3 11 10 12"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect
        x="35"
        y="24"
        width="60"
        height="13"
        rx="4"
        fill="#ded2e6"
        stroke="#a89ab6"
        strokeWidth="1.4"
      />
      <rect x="38" y="27" width="54" height="7" fill="url(#jar-lines)" />
      {!empty && (
        <>
          <rect
            x="38"
            y="71"
            width="35"
            height="23"
            rx="3"
            fill="#ead9fc"
            transform="rotate(-17 38 71)"
          />
          <path
            d="m47 77 14-4m-12 10 16-5"
            stroke="#b7a0cc"
            strokeLinecap="round"
          />
          <rect
            x="61"
            y="92"
            width="32"
            height="22"
            rx="3"
            fill="#f2c7d2"
            transform="rotate(13 61 92)"
          />
          <path d="m68 101 13 3" stroke="#c990a2" strokeLinecap="round" />
          <rect
            x="35"
            y="98"
            width="31"
            height="20"
            rx="3"
            fill="#f7ddbf"
            transform="rotate(-8 35 98)"
          />
          <path d="m42 106 16-2" stroke="#cfb48d" strokeLinecap="round" />
          <path d="M77 67c-6-7-12 2 0 9 12-7 6-16 0-9Z" fill="#d3b6e9" />
        </>
      )}
      <path
        d="M108 46v8m-4-4h8M21 29v6m-3-3h6"
        stroke="#b6a0c4"
        strokeLinecap="round"
      />
    </svg>
  );
}
