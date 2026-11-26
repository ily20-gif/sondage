import { DataTypes } from "sequelize";
import sequelize from "../lib/sequelize.js";

const Notification = sequelize.define("Notification", {
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  poll_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Polls',
      key: 'id'
    }
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
}, {
  timestamps: true,
});

export default Notification;