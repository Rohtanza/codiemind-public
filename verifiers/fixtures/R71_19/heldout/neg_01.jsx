const React = require("react");
const { FiX, FiCheck } = require("react-icons/fi");

function ConfirmBar({ onConfirm, onCancel }) {
  return (
    <div className="confirm-bar">
      <button onClick={onConfirm}><FiCheck /></button>
      <button onClick={onCancel}><FiX /></button>
    </div>
  );
}

module.exports = { ConfirmBar };
