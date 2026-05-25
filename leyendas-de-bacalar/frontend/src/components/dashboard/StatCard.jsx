import Card from '../ui/Card.jsx';

function StatCard({ label, value }) {
  return (
    <Card className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </Card>
  );
}

export default StatCard;
