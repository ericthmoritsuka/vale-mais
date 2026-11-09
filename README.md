# Vale Mais

Um app web (PWA) para o supermercado: diz qual produto sai mais barato por quilo, litro, metro,
unidade ou 100 folhas. O projeto completo está em [`DESIGN.md`](DESIGN.md); esta é a versão 2, ainda
só a calculadora (passo 1 da seção 13). O que mudou em cada versão está em
[`CHANGELOG.md`](CHANGELOG.md).

## O que faz

- **Comparar:** dois cartões de produto para começar, até seis. Cada um tem nome (opcional),
  preço, quantidade no pacote, tamanho de cada e unidade (g, kg, ml, L, un, m, folhas). Assim
  "12 rolos × 30 m" é pacote 12, tamanho 30, unidade m: 360 m.
- **Preço como no caixa:** no preço e no preço por unidade da etiqueta, digite só os números,
  que entram pela direita com dois decimais: 89 é 0,89, 324 é 3,24, e apagar tira o último. Colar
  "12,99" lê a vírgula. Tamanho e quantidade aceitam vírgula normalmente (1,5 L).
- **Tipo de preço:** Normal, Clube/app, Atacarejo (a partir de N un.) e Leve X Pague Y, que entra
  na conta como preço × Y ÷ X.
- **Resultado:** assim que dois produtos estão completos, o mais barato fica destacado e o
  resultado começa pela porcentagem: "Papel A sai 13% mais barato." Com três ou mais, mostra a
  ordem, e cada um diz quanto o 1º sai mais barato que ele. A conta é sempre a do mais barato
  (1 menos o preço dele dividido pelo do outro), nunca "o outro sai X% mais caro". Abaixo de 2%
  aparece uma casa decimal; até 0,5% de diferença é "praticamente igual". Unidades que não
  convertem (kg e un, m e folhas) não são comparadas entre si.
- **Ver valores:** um toque mostra os reais por trás da porcentagem: a diferença por unidade e
  quanto se economiza levando a mesma quantidade do outro produto, com o mesmo preço da conta
  (o Leve X Pague Y conta como o conjunto, e o texto avisa). O preço por unidade de cada produto
  fica sempre à vista.
- **Avisos:** tipos diferentes (por exemplo, folha dupla e folha simples) e preço por unidade da
  etiqueta mais de 2% diferente da conta.
- **Guarda a comparação** no aparelho até tocar em **Limpar**, e abre sem internet depois da
  primeira visita.

## Rodar localmente

Não há build. Sirva a pasta do repositório com qualquer servidor estático, por exemplo:

```sh
python3 -m http.server 8000
```

e abra `http://localhost:8000/`. O service worker só funciona em `localhost` ou HTTPS.

## Testes

```sh
node --test tests/*.test.mjs
```

A matemática fica em `js/units.js`, `js/compare.js` e `js/money.js` (o preço digitado como no
caixa), sem DOM, e os testes rodam no Node.

## Publicar uma versão nova

Ao mudar qualquer arquivo do app, aumente `VERSION` em `sw.js`. O app mostra **Nova versão pronta**
e troca quando a pessoa toca em **Atualizar**. Um arquivo novo em `js/` ou `icons/` também entra na
lista `SHELL` do `sw.js`; o teste `tests/shell.test.mjs` avisa se faltar.
