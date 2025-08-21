import { BoardGroupGenerator } from "./grouping";

describe('grid generator', () => {
  const emojis: string[] = ["🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "🟤", "⚫", "⚪"];

  beforeEach(async () => {
  });

  it('should generate 7x7 grid', () => {
    const grid = new BoardGroupGenerator(5).generateRandomContiguousGroups(7);
    let gridString = grid.map(r => r.map(num => emojis[num - 1] ?? "?").join(" ")).join("\n");
    expect(gridString).toEqual(
      "🟡 🟡 🔴 🔴 🔴 🔴 🟠" + "\n" +
      "🔵 🟡 🟡 🟡 🔴 🔴 🟠" + "\n" +
      "🔵 🔵 🟡 🟡 🟣 🔴 🟠" + "\n" +
      "🔵 🟣 🟣 🟣 🟣 🟣 🟠" + "\n" +
      "🔵 🟣 🟢 🟢 🟤 🟤 🟠" + "\n" +
      "🔵 🟢 🟢 🟢 🟤 🟤 🟠" + "\n" +
      "🔵 🟢 🟢 🟤 🟤 🟤 🟠"
    );

  });



  it('should generate 5x5 grid', () => {
    const grid = new BoardGroupGenerator(42).generateRandomContiguousGroups(5);
    let gridString = grid.map(r => r.map(num => emojis[num - 1] ?? "?").join(" ")).join("\n");
    expect(gridString).toEqual(
      "🔵 🔵 🔵 🟠 🟠" + "\n" +
      "🟢 🔵 🟠 🟠 🔴" + "\n" +
      "🟢 🔵 🟠 🔴 🔴" + "\n" +
      "🟢 🟢 🟢 🔴 🔴" + "\n" +
      "🟡 🟡 🟡 🟡 🟡"
    );
  });



  it('should generate 9x9 grid', () => {
    const grid = new BoardGroupGenerator(42).generateRandomContiguousGroups(9);
    let gridString = grid.map(r => r.map(num => emojis[num - 1] ?? "?").join(" ")).join("\n");
    expect(gridString).toEqual(
      "⚫ ⚫ ⚫ 🟣 ⚪ ⚪ ⚪ ⚪ ⚪" + "\n" +
      "⚫ ⚫ ⚫ 🟣 ⚪ ⚪ 🟠 🟠 ⚪" + "\n" +
      "🟢 ⚫ ⚫ 🟣 🟣 ⚪ 🟠 🟠 🟠" + "\n" +
      "🟢 ⚫ 🟣 🟣 🟣 🟡 🟠 🟠 🟠" + "\n" +
      "🟢 🟤 🟣 🟣 🟤 🟡 🟡 🟡 🟠" + "\n" +
      "🟢 🟤 🟤 🟤 🟤 🟡 🟡 🔴 🔴" + "\n" +
      "🟢 🟤 🟤 🔵 🟤 🟡 🟡 🔴 🔴" + "\n" +
      "🟢 🔵 🔵 🔵 🔵 🟡 🔴 🔴 🔴" + "\n" +
      "🟢 🟢 🟢 🔵 🔵 🔵 🔵 🔴 🔴"
    );
  });


});
