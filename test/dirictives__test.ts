import { expect } from "chai";
import { parseDirectives } from "../src/directiveParser";
describe("parseDirectives ", () => {
  it("should retrun [] when theres no directives specified", function () {
    expect(parseDirectives("select * from *")).to.have.lengthOf(0);
    expect(parseDirectives("-- helloworld")).to.have.lengthOf(0);
    expect(parseDirectives("-- ts-sql-plugin:   \n select")).to.have.lengthOf(
      0
    );
  });

  it("should parse single line directives", function () {
    const result = parseDirectives(`
     -- ts-sql-plugin:ignore-cost
     select * from *
    `);
    expect(result).to.have.lengthOf(1, "it should find one directive");
    expect(result[0].directive).to.eq("ignore-cost");
    expect(result[0].arg).to.be.undefined;
  });

  it("should parse single line with json argument", function () {
    const result = parseDirectives(`
   -- ts-sql-plugin:emit("../emitdir/filename")  
   select * from *
`);
    expect(result).to.have.lengthOf(1, "it should find one directive");
    expect(result[0].directive).to.eq("emit");
    expect(result[0].arg).to.eq("../emitdir/filename");
  });

  it("should parse multiple lines with directive", function () {
    const result = parseDirectives(`
      -- ts-sql-plugin:emit("../emitdir/filename")
        -- ts-sql-plugin:ignore-cost
select * from *
`);
    expect(result).to.have.lengthOf(2, "it should find two directives");
    expect(result[0]).to.deep.eq({
      directive: "emit",
      arg: "../emitdir/filename",
    });
    expect(result[1]).to.deep.eq({ directive: "ignore-cost", arg: undefined });
  });

});
