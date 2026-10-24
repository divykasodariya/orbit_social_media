const EmptyState = ({ title, description }) => (
  <div className="text-center py-16 text-gray-500">
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p>{description}</p>
  </div>
);

export default EmptyState;
