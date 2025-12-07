import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { MATERIAL_IMPORTS } from '../../material-imports';
import { DisplayCell, SelectionStatus } from '../../model/game-board';
import { SaveDataService } from '../../service/save-data.service';
import { Board } from '../board/board';
import { NoopSaveDataService } from './noop-save-data-service';


@Component({
  selector: 'app-board-tutorial',
  imports: [CommonModule, ...MATERIAL_IMPORTS, Board, RouterLink],
  templateUrl: './board-tutorial.html',
  styleUrl: './board-tutorial.scss',
  providers: [
    { provide: SaveDataService, useClass: NoopSaveDataService },
  ],
})
export class BoardTutorialComponent implements OnInit, AfterViewInit {
  @ViewChild(Board) boardComponent?: Board;

  steps: TutorialStep[] = [];
  currentStepIndex = 0;
  nextDisabled = false;
  currentStepHtml: SafeHtml;

  constructor(
    private sanitizer: DomSanitizer,
  ) { }


  async ngOnInit(): Promise<void> {
    this.steps = this.buildSteps();
    this.currentStepIndex = 0;
  }


  ngAfterViewInit(): void {
    this.tryApplyStep();
  }


  async nextStep(): Promise<void> {
    if (!this.steps.length)
      return;

    const nextIndex = this.currentStepIndex >= this.steps.length - 1
      ? 0
      : this.currentStepIndex + 1;
    await this.goToStep(nextIndex);
  }


  private buildSteps(): TutorialStep[] {
    let highlightTimer: number;

    return [
      {
        body: `Welcome to <strong>Somebers</strong>!
                <br>As you click <em>Next</em>, keep reading up here — we’ll guide you through how to play.
              `,
        stepAction: async () => {
          await this.boardComponent.changeGameNumberFromUi(-11);
          this.iterateCells((r, ri, c, ci) => {
            c.status = SelectionStatus.CLEARED;
            c.hideBackground = true
          })

        },
      },
      {
        body: 'Each game has its own unique set of <em>essential</em> numbers — shown below — that you’ll need to discover in order to solve the puzzle.',
        stepAction: async () => {
          this.iterateCells((r, ri, c, ci) => {
            c.status = c.required ? SelectionStatus.NONE : SelectionStatus.CLEARED;
            c.hideBackground = true
          })
        },
      },
      {
        body: `Unfortunately the essential numbers have camouflaged themselves within a dense forest of similar numbers.`,
        stepAction: async () => {
          this.iterateCells((r, ri, c, ci) => {
            c.status = SelectionStatus.NONE;
            c.hideBackground = true
          })
        },
      },
      {
        body: `To give clues about where the essential numbers are hidden, the header beside each row shows the sum of all essential cells in that row.`,
        stepAction: async () => {
          this.iterateCells((r, ri, c, ci) => {
            if (!c.required)
              c.status = SelectionStatus.CLEARED;

            c.hideBackground = true;

            if (ri !== 0 && ci === 0)
              c.hideBackground = false;
          })
        },
      },
      {
        body: `Likewise, the header above each column shows the sum of all essential cells in that column.`,
        stepAction: async () => {
          this.iterateCells((r, ri, c, ci) => {
            if (!c.required)
              c.status = SelectionStatus.CLEARED;

            c.hideBackground = true;

            if (ri === 0 && ci !== 0)
              c.hideBackground = false;
          })
        },
      },
      {
        body: `Lastly, numbers are grouped by color. The sum of essential numbers in each color group is shown in that group's upper-left corner as an additional clue.`,
        stepAction: async () => {
          this.iterateCells((r, ri, c, ci) => {
            if (!c.required)
              c.status = SelectionStatus.CLEARED;

            c.hideBackground = true;

            if (ri !== 0 && ci !== 0)
              c.hideBackground = false;
          })
        },
      },
      {
        body: `With those clues in mind, let's focus on this highlighted row that must sum to <code>2</code>.`,
        stepAction: async () => {
          this.iterateCells((r, ri, c, ci) => {
            c.status = SelectionStatus.NONE;
            c.hideBackground = false;

            if (ri === 1 && ci === 0)
              c.highlighted = true
          })

          const cells = this.boardComponent.gameBoard.fullBoard.map((r, ri) => r.filter((c, ci) => !!c && ri === 1 && ci !== 0)).flat()
          highlightTimer = setInterval(() => cells.forEach(c => c.highlighted = !c.highlighted), 800);
        },
      },
      {
        body: `Since the essential cells must add up to <code>2</code>, we know anything greater than <code>2</code> can be eliminated.`,
        stepAction: async () => {
          clearInterval(highlightTimer);
          this.iterateCells((r, ri, c, ci) => {
            c.highlighted = false;

            if (ri === 1 && ci === 0)
              c.highlighted = true;
          })
        },
      },
      {
        body: `To eliminate a cell, <strong>quickly</strong> swipe down on it (or right-click on a computer), and the cell will disappear.
                <br>Now eliminate everything beside the selected row header showing <code>2</code> that is greater than <code>2</code>. 
                <br><em>You must eliminate at least one cell to continue.</em>`,
        stepAction: async () => {
          this.nextDisabled = true;

          let cellCleared = false;
          while (!cellCleared) {
            await new Promise(r => setTimeout(r, 100));
            cellCleared = this.boardComponent.gameBoard.playArea.some(r => r.some(c => c.status === SelectionStatus.CLEARED));
          }
          this.nextDisabled = false;
        },
      },
      {
        body: `Since the row must add up to <code>2</code>, we know that only the <code>2</code> is essential, and the <code>1</code> cannot be used.`,
        stepAction: async () => { },
      },
      {
        body: `Now, to select any cells that <strong>must</strong> be essential (i.e., only the <code>2</code>), simply tap it.
                <br><em>You must select at least one cell to continue.</em>`,
        stepAction: async () => {
          this.nextDisabled = true;

          let cellSelected = false;
          while (!cellSelected) {
            await new Promise(r => setTimeout(r, 50));
            cellSelected = this.boardComponent.gameBoard.playArea.some(r => r.some(c => c.status === SelectionStatus.SELECTED));
          }
          this.nextDisabled = false;

          await new Promise(r => setTimeout(r, 2600));
          this.iterateCells((r, ri, c, ci) => {
            c.highlighted = false;
          })
        },
      },
      {
        body: `I'm sure you noticed that by selecting the <code>2</code>, several other cells disappeared.`,
        stepAction: async () => { },
      },
      {
        body: `When all essential cells in a section are selected, all the non-essential cells are automatically cleared.`,
        stepAction: async () => { },
      },
      {
        body: `If at any point you mistakenly try to clear an essential cell or select a non-essential cell, the cell will wiggle.
                <br>This is the game's way of saying <em>“you chose poorly.”</em>`,
        stepAction: async () => { },
      },
      {
        body: `Notice on the highlighted <code>5</code> header below, there is a tiny <code><sup>𝛴</sup>2</code> in the upper-right corner.`,
        stepAction: async () => {
          this.iterateCells((r, ri, c, ci) => {
            if (ri === 0 && ci === 3)
              c.highlighted = true;
          })
        },
      },
      {
        body: `The number beside a <code>𝛴</code> simply shows the sum of cells you've already selected in that section.`,
        stepAction: async () => { },
      },
      {
        body: `You now know the fundamentals of how to play. Finish the game below by eliminating any non-essential cells and selecting <strong>all</strong> essential ones.
                <br>You'll know you've finished when confetti showers the screen accompanied by a deprecating insult.`,
        stepAction: async () => {
          this.iterateCells((r, ri, c, ci) => {
            c.highlighted = false;
          })
        },
      },
      {
        body: `Don't worry — even if the game doesn't believe in you, I do.`,
        stepAction: async () => { },
      },
      {
        body: `That said... keep an eye on your mistakes and your “time spent.” Anything greater than zero, or less than perfection, is a failure in my mind.`,
        stepAction: async () => { },
      },
    ];
  }


  private iterateCells(callBack: (row: DisplayCell[], rowIndex: number, cell: DisplayCell, columnIndex: number) => void): void {
    this.boardComponent.gameBoard.fullBoard.forEach((r, ri) => r.forEach((c, ci) => {
      if (c)
        callBack(r, ri, c, ci)
    }));
  }


  private async goToStep(stepIndex: number): Promise<void> {
    this.currentStepIndex = stepIndex;
    await this.tryApplyStep();
  }


  private async tryApplyStep(): Promise<void> {
    const step = this.steps[this.currentStepIndex];
    if (!step)
      return;

    await new Promise(r => setTimeout(r, 0));
    this.currentStepHtml = this.sanitizer.bypassSecurityTrustHtml(this.steps[this.currentStepIndex].body);
    await step.stepAction();
  }

}


interface TutorialStep {
  body: string;
  stepAction: () => Promise<void> | void;
}
