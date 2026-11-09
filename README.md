# Vale Mais

Um app web (PWA) para o supermercado: diz qual produto sai mais barato por quilo, litro, metro,
unidade ou 100 folhas. O projeto completo está em [`DESIGN.md`](DESIGN.md); esta é a versão 1, só
a calculadora (passo 1 da seção 13).

## O que faz

- **Comparar:** dois cartões de produto para começar, até seis. Cada um tem nome (opcional),
  preço, quantidade no pacote, tamanho de cada e unidade (g, kg, ml, L, un, m, folhas). Assim
  "12 rolos × 30 m" é pacote 12, tamanho 30, unidade m: 360 m.
- **Tipo de preço:** Normal, Clube/app, Atacarejo (a partir de N un.) e Leve X Pague Y, que entra
  na conta como preço × Y ÷ X.
- **Resultado:** assim que dois produtos estão completos, o mais barato fica destacado, com "X%
  mais barato por <unidade>" e a diferença em R$. Com três ou mais, mostra a ordem. Até 0,5% de
  diferença é "praticamente igual". Unidades que não convertem (kg e un, m e folhas) não são
  comparadas entre si.
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

A matemática fica em `js/units.js` e `js/compare.js`, sem DOM, e os testes rodam no Node.

## Publicar uma versão nova

Ao mudar qualquer arquivo do app, aumente `VERSION` em `sw.js`. O app mostra **Nova versão pronta**
e troca quando a pessoa toca em **Atualizar**. Um arquivo novo em `js/` ou `icons/` também entra na
lista `SHELL` do `sw.js`; o teste `tests/shell.test.mjs` avisa se faltar.
