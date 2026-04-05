export function ShinakoAvatar() {
  return (
    <svg
      width="192"
      height="192"
      viewBox="0 0 192 192"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-lg"
    >
      {/* 背景円 */}
      <circle cx="96" cy="96" r="90" fill="#E8DFD0" />
      <circle cx="96" cy="96" r="85" fill="#F5EDE0" />

      {/* 風のうずまき（背景装飾） */}
      <path
        d="M30 80 Q50 60 80 70 Q100 75 110 60 Q125 42 150 55"
        stroke="#D4C5B0"
        strokeWidth="1.5"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M25 110 Q55 95 75 105 Q95 115 120 100 Q140 88 165 95"
        stroke="#D4C5B0"
        strokeWidth="1"
        fill="none"
        opacity="0.4"
      />
      <path
        d="M40 135 Q60 125 85 130 Q110 135 130 120 Q150 108 170 115"
        stroke="#D4C5B0"
        strokeWidth="1"
        fill="none"
        opacity="0.3"
      />

      {/* 体（旅装束） */}
      <path
        d="M75 120 Q80 105 96 100 Q112 105 117 120 L120 155 Q108 162 96 164 Q84 162 72 155 Z"
        fill="#6B8E7B"
      />
      {/* 襟元 */}
      <path
        d="M88 105 L96 115 L104 105"
        stroke="#5A7D6A"
        strokeWidth="1.5"
        fill="none"
      />
      {/* 帯 */}
      <rect x="78" y="125" width="36" height="6" rx="2" fill="#D4A574" />

      {/* 首 */}
      <rect x="91" y="92" width="10" height="12" rx="4" fill="#F5D6C0" />

      {/* 顔 */}
      <circle cx="96" cy="78" r="22" fill="#F5D6C0" />

      {/* 髪（風になびく） */}
      <path
        d="M74 72 Q72 55 80 48 Q88 42 96 44 Q104 42 112 48 Q120 55 118 72"
        fill="#5A4A3A"
      />
      {/* 風になびく髪（右へ） */}
      <path
        d="M118 65 Q128 58 140 56 Q148 55 155 60"
        stroke="#5A4A3A"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M116 72 Q130 68 142 65 Q152 63 158 68"
        stroke="#5A4A3A"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M114 78 Q125 76 135 74"
        stroke="#5A4A3A"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* 前髪 */}
      <path
        d="M78 68 Q82 58 90 60 Q94 56 96 56 Q98 56 102 60 Q110 58 114 68"
        fill="#5A4A3A"
      />

      {/* 目 */}
      <ellipse cx="88" cy="78" rx="2.5" ry="3" fill="#3A3A3A" />
      <ellipse cx="104" cy="78" rx="2.5" ry="3" fill="#3A3A3A" />
      {/* 目のハイライト */}
      <circle cx="89" cy="77" r="1" fill="white" />
      <circle cx="105" cy="77" r="1" fill="white" />

      {/* 口（にこっ） */}
      <path
        d="M92 86 Q96 90 100 86"
        stroke="#C4856A"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* 頬紅 */}
      <circle cx="83" cy="84" r="4" fill="#F0C0B0" opacity="0.5" />
      <circle cx="109" cy="84" r="4" fill="#F0C0B0" opacity="0.5" />

      {/* 風のパーティクル */}
      <circle cx="145" cy="50" r="2" fill="#6B8E7B" opacity="0.4" />
      <circle cx="155" cy="70" r="1.5" fill="#6B8E7B" opacity="0.3" />
      <circle cx="160" cy="58" r="1" fill="#6B8E7B" opacity="0.5" />
      <circle cx="138" cy="42" r="1.5" fill="#6B8E7B" opacity="0.35" />

      {/* 袖のひらひら（風になびき） */}
      <path
        d="M117 115 Q125 108 135 112 Q140 115 138 120"
        fill="#5A7D6A"
        opacity="0.8"
      />
      <path
        d="M75 115 Q67 108 60 112 Q55 116 58 120"
        fill="#5A7D6A"
        opacity="0.8"
      />
    </svg>
  );
}
