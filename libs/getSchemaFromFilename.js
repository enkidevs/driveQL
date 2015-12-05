import fsp from 'fs-promise';

export default function(filename) {
  return fsp.readFile('./fixtures/parsed_example.json', 'utf8').then((s) => {
    return JSON.parse(s);
  });
}
