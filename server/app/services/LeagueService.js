const GeneticAlgorithm = require('../genetic-algorithm');
const evolveGa = require('evolve-ga');
const createCollage = require('@settlin/collage');
const json = require('../assets/league/champions.json');
const fs = require('fs');
const Champion = require('../models/Champion');
// const uploadFile = require("./uploadFile");
let generation = 1;
let execution = 1;
let finalFitvalue = 0;
let allChromosomes = [];
let ENEMY_GENES = [];
let PICKED_GENES = [];
let totalChampions = 146;
let CHROMOSOME_LENGTH = 5;
let multiplier = 1.0;
let POPULATION_SIZE;
let MUTATION_CHANCE;
let MAX_GENERATIONS;
// let MAX_EXECUTIONS = 3;
let POSSIBLE_GENES = [];
let COMPOSITION_STRATEGY;
let MAX_FIT_VALUE = 81.28;
// let CURRENT_EXECUTION;
let fileName = '';
// let filePathReports = '';
// let filePathTimeReports = '';

class LeagueAlgorithm extends GeneticAlgorithm {
  constructor() {
    super();
    this.genetic = this.genetic.bind(this);

    this.crossOverFunction = this.crossOverFunction.bind(this);
    this.mutationFunction = this.mutationFunction.bind(this);
    this.fitnessFunction = this.fitnessFunction.bind(this);
    this.selectionFunction = this.selectionFunction.bind(this);

    this.validChromosome = this.validChromosome.bind(this);
    this.validCompositionFunction = this.validCompositionFunction.bind(this);
    this.validRolesFunction = this.validRolesFunction.bind(this);
    this.validCountersFunction = this.validCountersFunction.bind(this);
    this.showCompositionInfo = this.showCompositionInfo.bind(this);
    this.generatePopulationFromPicked = this.generatePopulationFromPicked.bind(
      this,
    );
  }

  async validCompositionFunction(champions) {
    let winrateComposition = 0;

    let hasCarry = false;
    let winrateCarry = 0;

    let hasSupp = false;
    let winrateSupp = 0;

    let hasMid = false;
    let winrateMid = 0;

    let hasTop = false;
    let winrateTop = 0;

    let hasJungle = false;
    let winrateJungle = 0;

    champions.map(champion => {
      Object.entries(champion.infos[0].winrate).forEach(([role, winrate]) => {
        if (role === 'top' && !hasTop) {
          hasTop = true;
          winrateTop = winrate;
          return;
        }

        if (role === 'jungler' && !hasJungle) {
          hasJungle = true;
          winrateJungle = winrate;
          return;
        }

        if (role === 'mid' && !hasMid) {
          hasMid = true;
          winrateMid = winrate;
          return;
        }

        if (role === 'carry' && !hasCarry) {
          hasCarry = true;
          winrateCarry = winrate;
          return;
        }

        if (role === 'support' && !hasSupp) {
          hasSupp = true;
          winrateSupp = winrate;
          return;
        }
      });
    })


    if (hasCarry && hasSupp && hasMid && hasTop && hasJungle) {
      winrateComposition =
        (winrateCarry +
          winrateSupp +
          winrateMid +
          winrateTop +
          winrateJungle) /
        5;
    }

    return winrateComposition;
  }

  async validRolesFunction(champion, strategies, multiplier) {
    if (!champion.roles) {
      return multiplier;
    }

    let hasStrategy = champion.roles.filter(value => strategies.includes(value))
      .length;

    if (!hasStrategy) {
      return multiplier;
    }

    return +(0.1 + multiplier).toFixed(12);
  }

  async validCountersFunction(champion, multiplier) {
    if (!champion.counters) {
      return multiplier;
    }

    let isCountered = champion.counters.filter(value =>
      ENEMY_GENES.includes(value),
    ).length;

    if (isCountered) {
      return multiplier;
    }

    return +(0.1 + multiplier).toFixed(12);
  }

  async fitnessFunction(chromosome) {
    const champions = await Champion.find({ id_ddragon: chromosome.genes });
    let self = this;
    let multiplier = 1.0;
    let fitValue = await this.validCompositionFunction(champions);

    if (!PICKED_GENES.every(v => chromosome.genes.includes(v)) || fitValue == 0) {
      return 0;
    }

    allChromosomes.push(chromosome);

    switch (COMPOSITION_STRATEGY) {
      case 'hardengage':
        champions.map(async champion => {
          multiplier = await self.validRolesFunction(
            champion,
            ['Hard Engage'],
            multiplier,
          );

          if (ENEMY_GENES.length) {
            multiplier = await self.validCountersFunction(champion, multiplier);
          }
        });

        fitValue = (fitValue * multiplier) / MAX_FIT_VALUE;
        if (fitValue > finalFitvalue) {
          finalFitvalue = fitValue;
          this.finalChromosome = chromosome;
        }

        return fitValue;
      case 'teamfight':
        champions.map(async champion => {
          multiplier = await self.validRolesFunction(
            champion,
            ['Area of Effect'],
            multiplier,
          );

          if (ENEMY_GENES.length) {
            multiplier = await self.validCountersFunction(champion, multiplier);
          }

        });

        return fitValue;
      case 'pusher':
        champions.map(async champion => {
          multiplier = await self.validRolesFunction(
            champion,
            ['Poke', 'Waveclear'],
            multiplier,
          );

          if (ENEMY_GENES.length) {
            multiplier = await self.validCountersFunction(champion, multiplier);
          }

        });

        fitValue = (fitValue * multiplier) / MAX_FIT_VALUE;

        if (fitValue > finalFitvalue) {
          finalFitvalue = fitValue;
          this.finalChromosome = chromosome;
        }

        return fitValue;
    }
    
  }

  async showCompositionInfo() {
    let championsIcons = [];

    if (this.finalChromosome) {
      let finalChampions = await Champion.find({ id_ddragon: this.finalChromosome.genes });
      finalChampions.map(champion => {
        championsIcons.push(champion.icon);
      })

    }

    let options = {
      sources: championsIcons,
      width: 5,
      height: 1,
      imageWidth: 120,
      imageHeight: 120,
    };

    createCollage(options).then(canvas => {
      let src = canvas.jpegStream();
      const blobName = `${fileName}.png`;
      let dest = fs.createWriteStream(blobName);

      src.pipe(dest);
      // src.on("end", function () {
      //     uploadFile(blobName);
      // });
    });
  }

  generateGenes() {
    return [...Array(CHROMOSOME_LENGTH)].map(() => {
      return POSSIBLE_GENES[Math.floor(Math.random() * POSSIBLE_GENES.length)];
    })
  }

  async generatePopulation() {
    let self = this;

    return [...Array(POPULATION_SIZE)].map(() => {
      let possibleChromosome = {
        fitness: 0,
        genes: self.generateGenes()
      }
      let isUniqueGenes = [...new Set(possibleChromosome.genes)].length === CHROMOSOME_LENGTH;

      while (!isUniqueGenes) {
        possibleChromosome.genes = self.generateGenes();
        isUniqueGenes = [...new Set(possibleChromosome.genes)].length === CHROMOSOME_LENGTH;
      }

      return possibleChromosome;
    });
  }

  async generatePopulationFromPicked() {
    return [...Array(POPULATION_SIZE)].map(() => {
      return {
        fitness: 0,
        genes: PICKED_GENES.concat(
          [...Array(CHROMOSOME_LENGTH - PICKED_GENES.length)].map(() => {
            return POSSIBLE_GENES[
              Math.floor(Math.random() * POSSIBLE_GENES.length)
            ];
          }),
        ),
      };
    });
  }

  async run() {
    return new Promise(async (resolve, reject) => {
      for (let i = 0; i < this.algorithm.population.length; i++) {
        this.algorithm.population[i].fitness = await this.fitnessFunction(this.algorithm.population[i]);
      }

      return resolve([...this.algorithm.population]);

    })
  }

  async genetic() {
    this.finalFitvalue = 0;
    // let start = new Date();

    if (PICKED_GENES.length > 0) {
      this.algorithm.population = await this.generatePopulationFromPicked();
    } else {
      this.algorithm.population = await this.generatePopulation();
    }

    try {
      // await this.createReportFile();
      // await this.createTimeReportFile();
      // await this.writeFileHeader();
      // await this.writeFileSecondsHeader();

      while (generation <= MAX_GENERATIONS) {
        await Promise.all([this.run()]).then(function (values) {
          generation++;
        });

        if (generation == MAX_GENERATIONS) {
          await this.showCompositionInfo();
        }

      }


      // let end = new Date();

      // await this.writeSecondsOnFile(start, end, end.getTime() - start.getTime());
    } catch (error) {
      throw Error(error);
    }
  }

  start(
    strategy,
    maxFitValue,
    populationSize,
    mutationChance,
    maxGenerations,
    currentExecution,
    bannedGenes,
    pickedGenes,
    enemyGenes,
  ) {
    MAX_GENERATIONS = Number(maxGenerations);
    COMPOSITION_STRATEGY = String(strategy);
    MAX_FIT_VALUE = maxFitValue;
    POPULATION_SIZE = Number(populationSize);
    MUTATION_CHANCE = mutationChance;
    // CURRENT_EXECUTION = currentExecution;
    ENEMY_GENES = enemyGenes;
    PICKED_GENES = pickedGenes;

    // filePathReports =
    //   'app/reports/' +
    //   strategy +
    //   '/PS-' +
    //   populationSize +
    //   '__MC-' +
    //   mutationChance +
    //   '__MG-' +
    //   maxGenerations +
    //   '.csv';
    // filePathTimeReports =
    //   'app/time-reports/' +
    //   strategy +
    //   '/PS-' +
    //   populationSize +
    //   '__MC-' +
    //   mutationChance +
    //   '__MG-' +
    //   maxGenerations +
    //   '.csv';

    POSSIBLE_GENES = Array.from({ length: totalChampions }, (v, k) => k + 1);
    let champions = POSSIBLE_GENES;

    if (bannedGenes) {
      champions = POSSIBLE_GENES.filter(x => !bannedGenes.includes(x));
    }

    this.algorithm = evolveGa.evolve({
      populationSize: POPULATION_SIZE,
      chromosomeLength: CHROMOSOME_LENGTH,
      possibleGenes: champions,
      mutationChance: MUTATION_CHANCE,
      fitnessFunction: this.fitnessFunction,
      selectionFunction: this.selectionFunction,
      crossOverFunction: this.crossOverFunction,
      mutationFunction: this.mutationFunction,
    });

    fileName =
      Math.random()
        .toString(36)
        .substring(2, 15) +
      Math.random()
        .toString(36)
        .substring(2, 15);

    // for (let execution = 1; execution <= MAX_EXECUTIONS; execution++) {
    this.genetic(execution);
    // }
    return fileName;
  }
}

module.exports = new LeagueAlgorithm();
