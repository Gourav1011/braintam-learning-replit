import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import subjectsRouter from "./subjects";
import coursesRouter from "./courses";
import liveClassesRouter from "./liveClasses";
import recordingsRouter from "./recordings";
import animatedVideosRouter from "./animatedVideos";
import homeworkRouter from "./homework";
import assignmentsRouter from "./assignments";
import testsRouter from "./tests";
import studentRouter from "./student";
import adminRouter from "./admin";
import teacherRouter from "./teacher";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(adminRouter);
router.use(teacherRouter);
router.use(subjectsRouter);
router.use(coursesRouter);
router.use(liveClassesRouter);
router.use(recordingsRouter);
router.use(animatedVideosRouter);
router.use(homeworkRouter);
router.use(assignmentsRouter);
router.use(testsRouter);
router.use(studentRouter);

export default router;
