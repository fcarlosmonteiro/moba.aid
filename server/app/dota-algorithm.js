const GeneticAlgorithm = require('./genetic-algorithm');
const evolveGa = require('evolve-ga');
const createCollage = require('@settlin/collage');
const json = require('./assets/league/champions.json');
const fs = require('fs');
// const uploadFile = require("./uploadFile");
let generation = 1;
let execution = 1;
let finalFitvalue = 0;
let allChromosomes = [];
let totalChampions = 121;
let POPULATION_SIZE;
let MUTATION_CHANCE;
let MAX_GENERATIONS;
// let MAX_EXECUTIONS = 3;
let COMPOSITION_STRATEGY;
let MAX_FIT_VALUE = 81.28;
// let CURRENT_EXECUTION;
let fileName = '';
// let filePathReports = '';
// let filePathTimeReports = '';

class DotaAlgorithm extends GeneticAlgorithm {
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
    this.showCompositionInfo = this.showCompositionInfo.bind(this);
  }

  validCompositionFunction(chromosome) {
    let winrateComposition = 0;

    let minCarry = false;
    let amountCarry = 0;

    let minSupp = false;
    let amountSupp = 0;

    let minDurable = false;
    let amountDurable = 0;

    chromosome.genes.map(gene => {
      json.map(function(champion) {
        if (gene === champion.id) {
          winrateComposition += champion.winrate;

          if (champion.roles.includes('carry') && minCarry > amountCarry) {
            amountCarry++;
            return;
          }

          if (champion.roles.includes('support') && minSupp > amountSupp) {
            amountSupp++;
            return;
          }

          if (champion.roles.includes('durable') && minSupp > amountDurable) {
            amountDurable++;
            return;
          }
        }

        if (
          amountCarry == minCarry &&
          amountSupp == minSupp &&
          amountDurable == minDurable
        ) {
          winrateComposition = winrateComposition / 5;
        } else {
          winrateComposition = 0;
        }
      });
    });

    return winrateComposition;
  }

  validRolesFunction(champion, strategies, multiplier) {
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

  mutationFunction(chromosome, possibleGenes) {
    var mutatedGenes = chromosome.genes.slice();
    var geneToMutateIndex = Math.floor(Math.random() * mutatedGenes.length);
    var possibleGenesFiltered = possibleGenes.filter(function(gene) {
      return gene !== mutatedGenes[geneToMutateIndex];
    });
    mutatedGenes[geneToMutateIndex] =
      possibleGenesFiltered[
        Math.floor(Math.random() * possibleGenesFiltered.length)
      ];
    var aux = [];
    aux[1] = {
      fitness: 0,
      genes: mutatedGenes,
    };

    if (!this.validChromosome(aux[1])) {
      return {
        fitness: chromosome.fitness,
        genes: mutatedGenes,
      };
    } else {
      return chromosome;
    }
  }

  crossOverFunction(chromosomes) {
    var offspring = [];
    var aux = [];

    for (var i = 0; i < chromosomes.length; i++) {
      var crossOverPoint = Math.floor(
        Math.random() * chromosomes[i].genes.length,
      );
      var parentA = chromosomes[Math.floor(Math.random() * chromosomes.length)];
      var parentB = chromosomes[Math.floor(Math.random() * chromosomes.length)];
      aux[1] = {
        fitness: 0,
        genes: parentA.genes
          .slice(0, crossOverPoint)
          .concat(parentB.genes.slice(crossOverPoint)),
      };
      if (!this.validChromosome(aux[1])) {
        offspring.push({
          fitness: 0,
          genes: parentA.genes
            .slice(0, crossOverPoint)
            .concat(parentB.genes.slice(crossOverPoint)),
        });
      }
    }

    return offspring;
  }

  selectionFunction(chromosomes) {
    chromosomes = chromosomes
      .sort(function(a, b) {
        return b.fitness - a.fitness;
      })
      .slice(0, Math.ceil(chromosomes.length / 2));
    chromosomes.map((chromosome, i) => {
      if (this.validChromosome(chromosome)) {
        chromosomes.splice(i, 1);
      }
    });
    return chromosomes;
  }

  fitnessFunction(chromosome) {
    let self = this;
    let fitvalueTeamFight = 0;
    let fitvalueHardEngage = 0;
    let fitvaluePusher = 0;
    let multiplier = 1.0;

    allChromosomes.push(chromosome);

    switch (COMPOSITION_STRATEGY) {
      case 'hardengage':
        fitvalueHardEngage = this.validCompositionFunction(chromosome);

        chromosome.genes.map(function(gene) {
          json.map(champion => {
            if (gene === champion.id) {
              multiplier = self.validRolesFunction(
                champion,
                ['initiator'],
                multiplier,
              );
            }
          });
        });

        fitvalueHardEngage = (fitvalueHardEngage * multiplier) / MAX_FIT_VALUE;

        if (fitvalueHardEngage > finalFitvalue) {
          // console.log(fitvalueHardEngage);
          finalFitvalue = fitvalueHardEngage;
          this.finalChromosome = chromosome;
        }

        return fitvalueHardEngage;
      case 'teamfight':
        fitvalueTeamFight = this.validCompositionFunction(chromosome);

        chromosome.genes.map(function(gene) {
          json.map(champion => {
            if (gene === champion.id) {
              multiplier = self.validRolesFunction(
                champion,
                ['disabler, escape'],
                multiplier,
              );
            }
          });
        });

        fitvalueTeamFight = (fitvalueTeamFight * multiplier) / MAX_FIT_VALUE;

        if (fitvalueTeamFight > finalFitvalue) {
          finalFitvalue = fitvalueTeamFight;
          this.finalChromosome = chromosome;
        }

        return fitvalueTeamFight;
      case 'pusher':
        fitvaluePusher = this.validCompositionFunction(chromosome);

        chromosome.genes.map(function(gene) {
          json.map(champion => {
            if (gene === champion.id) {
              multiplier = self.validRolesFunction(
                champion,
                ['nuker', 'pusher'],
                multiplier,
              );
            }
          });
        });

        fitvaluePusher = (fitvaluePusher * multiplier) / MAX_FIT_VALUE;

        if (fitvaluePusher > finalFitvalue) {
          finalFitvalue = fitvaluePusher;
          this.finalChromosome = chromosome;
        }

        return fitvaluePusher;
    }
  }

  validChromosome(chromosome) {
    var control = false;
    var genes = chromosome.genes;

    genes.forEach(function(item) {
      var filteredArray = genes.filter(function(itemFilter) {
        return item === itemFilter;
      });
      if (filteredArray.length > 1) {
        control = true;
      }
    });

    return control;
  }

  showCompositionInfo() {
    var championsIcons = [];
    var parsedJson = JSON.parse(JSON.stringify(json));

    if (this.finalChromosome) {
      console.log(this.finalChromosome);
      this.finalChromosome.genes.forEach(function(item) {
        var aux = parsedJson.find(function(champion) {
          // console.log(champion);
          return champion.id === item;
        });
        if (aux) {
          championsIcons.push('https://api.opendota.com' + aux.img);
        }
      });
    }

    var options = {
      sources: championsIcons,
      width: 5,
      height: 1,
      imageWidth: 256,
      imageHeight: 144,
    };

    createCollage(options).then(canvas => {
      var src = canvas.jpegStream();
      const blobName = `${fileName}.png`;
      var dest = fs.createWriteStream(blobName);

      src.pipe(dest);
      // src.on("end", function () {
      //     uploadFile(blobName);
      // });
    });
  }

  async genetic() {
    // var start = new Date();
    this.algorithm.resetPopulation();

    try {
      // await this.createReportFile();
      // await this.createTimeReportFile();
      // await this.writeFileHeader();
      // await this.writeFileSecondsHeader();

      while (generation <= MAX_GENERATIONS) {
        this.algorithm.run();
        // await this.writeGenerationsOnFile();
        allChromosomes = [];
        generation++;
      }

      this.finalFitvalue = 0;
      // var end = new Date();
      this.showCompositionInfo();
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
  ) {
    MAX_GENERATIONS = maxGenerations;
    COMPOSITION_STRATEGY = strategy;
    MAX_FIT_VALUE = maxFitValue;
    POPULATION_SIZE = populationSize;
    MUTATION_CHANCE = mutationChance;
    // CURRENT_EXECUTION = currentExecution;

    let possibleGenes = Array.from({ length: totalChampions }, (v, k) => k + 1);
    let champions = possibleGenes;

    if (bannedGenes) {
      champions = possibleGenes.filter(x => !bannedGenes.includes(x));
    }

    this.algorithm = evolveGa.evolve({
      populationSize: POPULATION_SIZE,
      chromosomeLength: 5,
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

    // for (var execution = 1; execution <= MAX_EXECUTIONS; execution++) {
    this.genetic(execution);
    // }
    return fileName;
  }
}

module.exports = new DotaAlgorithm();
