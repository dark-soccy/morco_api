const Joi = require("joi");

const productSchema = Joi.object({
  name: Joi.string().min(3).required(),
  category: Joi.string().min(3).required(),
  color: Joi.string().min(3).required(),
  size: Joi.string().min(1).required(),
  image_url: Joi.string().uri().required(),
  price: Joi.number().positive().required(),
});

const productPayloadSchema = Joi.alternatives().try(
  productSchema,
  Joi.array().items(productSchema).min(1),
);

const filterSchema = Joi.object({
  category: Joi.string().min(3),
  color: Joi.string().min(3),
  size: Joi.string().min(1),
});

module.exports = {
  productSchema,
  productPayloadSchema,
  filterSchema,
};
