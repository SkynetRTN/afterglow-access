import { GeneticAlgorithm } from "@kometbomb/genetic-algorithm";
import { max } from "moment";

export interface Gaussian {
    peak: number;
    mu: number;
    sigma: number;
}


export class GuassianFitter {
    algorithm: GeneticAlgorithm;
    generations = 100;
    populationSize = 2000;
    mutationRate = 0.3;
    errorTolerance = 1e-4
    errorSmoothing = 5

    private bestFits: Gaussian[];

    constructor(private data: { x: number[] | Float32Array, y: number[] | Float32Array }, seed: Gaussian = null) {
        if (!seed) {
            seed = {
                peak: Math.random(),
                mu: Math.random(),
                sigma: Math.random()
            }
        }

        const fitness = async (genotypes: Gaussian[]): Promise<number[]> => {
            return Promise.resolve(genotypes.map(genotype => {
                let c = 0;
                this.data.x.forEach((x, index) => {
                    c += Math.pow(this.data.y[index] - (genotype.peak * Math.exp(-0.5 * Math.pow((x - genotype.mu) / genotype.sigma, 2))), 2)
                })
                return 1 / c;
            }));
        };

        const mutation = (genotype: Gaussian): Gaussian => {
            let mutate = this.mutationRate >= Math.random();
            return {
                peak: mutate && Math.random() < 0.5 ? genotype.peak += genotype.peak * ((Math.random() - 0.5) * 2) * 0.2 : genotype.peak,
                mu: mutate && Math.random() < 0.5 ? genotype.mu += genotype.mu * ((Math.random() - 0.5) * 2) * 0.2 : genotype.mu,
                sigma: mutate && Math.random() < 0.5 ? genotype.sigma += genotype.sigma * ((Math.random() - 0.5) * 2) * 0.2 : genotype.sigma
            }
        }

        const crossover = (a: Gaussian, b: Gaussian): Gaussian => {
            return {
                peak: Math.random() < 0.5 ? a.peak : b.peak,
                mu: Math.random() < 0.5 ? a.mu : b.mu,
                sigma: Math.random() < 0.5 ? a.sigma : b.sigma
            }
        }

        this.algorithm = new GeneticAlgorithm<Gaussian>(
            {
                populationSize: this.populationSize,
                fitnessFunction: fitness,
                mutationFunction: mutation,
                crossoverFunction: crossover,
            },
            [seed]
        );

    }


    async go() {
        /**
         * Run for 500 generations printing out the current best genotype and mean fitness.
         */
        this.bestFits = [];
        for (let i = 1; i <= this.generations; ++i) {
            await this.algorithm.evolve();



            let bestFit = await this.algorithm.best();
            if (this.bestFits.length >= this.errorSmoothing) {
                let e = this.bestFits.map(fit => (Math.pow(fit.mu - bestFit.mu, 2) + Math.pow(fit.sigma - bestFit.sigma, 2) + Math.pow(fit.peak - bestFit.peak, 2)))
                if (Math.max(...e) < this.errorTolerance) {
                    break
                }
            }
            this.bestFits.push(bestFit);

            // console.log("generation =", i, "best =", await this.algorithm.best(), "meanFitness =", await this.algorithm.meanFitness());
        }

        return this.bestFits[this.bestFits.length - 1];
    }
}

