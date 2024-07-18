import polka from "polka";
import sirv from "sirv";
import chalk from "chalk";

const port = parseInt(process.env.PORT) || 3000;

const bundle = sirv("dist", { dev: true })
const pub = sirv("public", { dev: true })


polka()
  .use(bundle, pub)
  .listen(port, err => {
    if (err) throw err;
    console.log(`> ${chalk.blue(`http://localhost:${port}`)}`);
  });
