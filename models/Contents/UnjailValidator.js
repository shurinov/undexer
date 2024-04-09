import sequelizer from "../../db/index.js";
import { DataTypes } from "sequelize";

const UnjailValidator = sequelizer.define("content_unjail_validator", {
    address: {
        type: DataTypes.TEXT,
    },
});

export default UnjailValidator;
