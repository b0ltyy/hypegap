export default function SkeletonCard() {
  return (
    <div
      className="card"
      style={{
        overflow: "hidden",
        background:
          "linear-gradient(110deg, rgba(39,39,42,0.6) 8%, rgba(63,63,70,0.6) 18%, rgba(39,39,42,0.6) 33%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s linear infinite",
      }}
    >
      <div
        style={{
          aspectRatio: "2 / 3",
          background: "rgba(24,24,27,0.8)",
        }}
      />
      <div style={{ padding: 10 }}>
        <div
          style={{
            height: 12,
            width: "70%",
            borderRadius: 6,
            background: "rgba(63,63,70,0.8)",
            marginBottom: 6,
          }}
        />
        <div
          style={{
            height: 10,
            width: "40%",
            borderRadius: 6,
            background: "rgba(63,63,70,0.6)",
          }}
        />
      </div>
    </div>
  );
}
