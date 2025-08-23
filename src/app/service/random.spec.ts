import { Random } from "./random";

describe('random', () => {
  beforeEach(async () => {
  });

  it('should generate random numbers static', () => {
    expect(Random.generateFromSeed(1)).toEqual(0.6270739405881613);
    expect(Random.generateFromSeed(2)).toEqual(0.7342509443406016);
    expect(Random.generateFromSeed(3)).toEqual(0.7202267837710679);
  });


  it('should generate random numbers static', () => {
    let random = new Random(3);
    expect(random.next()).toEqual(0.7202267837710679);
    expect(random.next()).toEqual(0.9236361971125007);
    expect(random.next()).toEqual(0.6897749109193683);
    expect(random.next()).toEqual(0.5257466111797839);
  });
});
