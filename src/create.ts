import * as child_process from 'child_process';

// import ts from 'typescript'; // used as value, passed in by tsserver at runtime
import tss from 'typescript/lib/tsserverlibrary'; // used as type only

import { find_all_nodes, default_command, default_tags } from './utils';
import { make_fake_expression, Tags } from './make_fake_expression';

export interface TsSqlPluginConfig {
  command: string[];
  tags: Tags;
}

export function create(info: tss.server.PluginCreateInfo): tss.LanguageService {
  const logger = (msg: string) =>
    info.project.projectService.logger.info(`[ts-sql-plugin] ${msg}`);
  logger('config: ' + JSON.stringify(info.config));

  const config: TsSqlPluginConfig = {
    command: default_command,
    ...info.config,
    tags: { ...default_tags, ...(info.config || {}).tags },
  };

  return new Proxy(info.languageService, {
    get(target, p, receiver) {
      console.log('###1')
      if (p === 'getSemanticDiagnostics') {
        console.log('###2')
        return function getSemanticDiagnostics(
          fileName: string,
        ): tss.Diagnostic[] {
          console.log('###3')
          let origin_diagnostics = target.getSemanticDiagnostics(fileName);

          const program = info.languageService.getProgram();
          const fake_expression = make_fake_expression(
            program.getTypeChecker(),
            config.tags,
          );

          console.log('###4')
          const source_file = program.getSourceFile(fileName);
          const nodes: tss.TaggedTemplateExpression[] = find_all_nodes(
            source_file,
            n =>
              n.kind === tss.SyntaxKind.TaggedTemplateExpression &&
              (n as tss.TaggedTemplateExpression).tag &&
              (n as tss.TaggedTemplateExpression).tag.getText() === config.tags.sql,
          ) as any;

          console.log('###5')
          console.log('###5', nodes.length)
          const explain_rss = nodes.map(n => {
            console.log('###5')
            const make_diagnostic = (
              code: any,
              category: any,
              messageText: any,
            ) => ({
              file: source_file,
              start: n.getStart(),
              length: n.getEnd() - n.getStart(),
              source: 'ts-sql-plugin',
              code,
              category,
              messageText,
            });
            // one sql`select * from person ${xxx ? sql.raw`aaa` : sql.rakw`bbb`}` may generate two sqls, need to be explained one by one
            console.log('###6')
            let query_configs = fake_expression(n);
            for (const qc of query_configs) {
              let s = qc.text.replace(/\?\?/gm, 'null');
              let p = child_process.spawnSync(
                config.command[0],
                config.command.slice(1).concat(`EXPLAIN ${s}`),
              );
              console.log('###7')
              console.error((p.stderr.toString as any)('utf8'));
              if (p.status) {
                console.log('###8')

                return make_diagnostic(
                  1,
                  tss.DiagnosticCategory.Error,
                  (p.stderr.toString as any)('utf8'),
                );
              }
            }
          });
          return [...origin_diagnostics, ...explain_rss.filter(v => !!v)];
        };
      }
      return target[p];
    },
  });
}
