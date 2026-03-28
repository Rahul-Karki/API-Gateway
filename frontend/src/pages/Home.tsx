import { motion } from "framer-motion"
import ApiTester from "@/components/ApiTester/ApiTester"

const Home = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <ApiTester />
    </motion.div>
  )
}

export default Home;