export function describeReleaseTree(status, commit) {
  if (!status.trim()) return { ok: true, message: `Árvore Git limpa. Commit para publicação: ${commit}` };
  const entries = status.trimEnd().split(/\r?\n/);
  const details = entries.slice(0, 12).map((entry) => `  ${entry}`);
  if (entries.length > 12) details.push(`  ... e mais ${entries.length - 12}.`);
  return {
    ok: false,
    message: [
      `Publicação bloqueada: ${entries.length} arquivo(s) alterado(s) ou não rastreado(s) no Git.`,
      ...details,
      "Revise, registre e valide o código exato que será publicado antes do deploy.",
    ].join("\n"),
  };
}
