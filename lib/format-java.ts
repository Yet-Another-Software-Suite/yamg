import * as prettier from "prettier";
import pluginJava from "prettier-plugin-java";

/** Format generated Java the way the site shows it. */
export function formatJava(java: string): Promise<string> {
  return prettier.format(java, { parser: "java", plugins: [pluginJava] });
}
