import { Router } from "express";
import getCPUs from "../filter-data/cpus.mjs";
import getGPUs from "../filter-data/gpus.mjs";
import getProductsRouter from "./getProducts.mjs";
import productRouter from "./product.mjs";
import facetsRouter from "./facets.mjs";
import blogRouter from "./blog.mjs";

const router = Router();

router.use("/cpu", getCPUs);
router.use("/gpu", getGPUs);
router.use("/getProducts", getProductsRouter);
router.use("/product", productRouter);
router.use("/facets", facetsRouter);
router.use("/blog", blogRouter);

export default router;
