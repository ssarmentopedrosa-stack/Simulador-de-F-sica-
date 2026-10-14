# ONDAS LAB 3D — Laboratório Virtual de Oscilações e Ondas

Plataforma educacional e científica de alta fidelidade para investigação de fenômenos mecânicos, oscilatórios, ondulatórios e acústicos em 3D, com visualização em tempo real, rigor matemático analítico e numérico (RK4), banco de questões contextualizadas no padrão ENEM, experimentos guiados pelo método científico e modo apresentação para projetores em sala de aula.

---

## 🔬 Modelos Físicos e Rigor Científico

1. **Movimento Harmônico Simples (MHS)**
   - Soluções analíticas exatas da equação diferencial $\ddot{x} + \omega^2 x = 0$.
   - Relação cinemática fundamental $a(t) = -\omega^2 x(t)$, $v(t) = -A\omega\sin(\omega t + \phi_0)$.
   - Projeção geométrica do Movimento Circular Uniforme (MCU) no eixo com representação fasorial e decomposição vetorial de velocidade e aceleração.

2. **Oscilador Massa-Mola (Horizontal e Vertical)**
   - Resolução das 4 categorias de amortecimento sob condições iniciais $x(0) = x_0$ e $v(0) = v_0$:
     - **Não-amortecido ($\gamma = 0$):** conservação estrita da energia mecânica $E_m = E_c + E_p$.
     - **Subamortecido ($\gamma < \omega_0$):** decaimento pseudo-periódico com frequência amortecida $\omega_d = \sqrt{\omega_0^2 - \gamma^2}$.
     - **Criticamente amortecido ($\gamma = \omega_0$):** retorno mais rápido ao equilíbrio sem inversão de fase.
     - **Superamortecido ($\gamma > \omega_0$):** decaimento biexponencial não oscilatório.
   - **Regime Forçado:** superposição exata da resposta transiente homogênea $x_h(t)$ com a solução particular permanente $x_p(t) = A_p \cos(\omega_e t - \delta)$.
   - Deformação procedural contínua da hélice tridimensional e vetores de força elástica com orientação consistente em tração e compressão.

3. **Pêndulo Simples Não-Linear**
   - Integrador numérico de Runge-Kutta de 4ª Ordem (RK4) com conservação de energia e passo temporal adaptativo.
   - Cálculo do período teórico exato $T_{\text{exato}} = 4\sqrt{L/g} K(\sin^2(\theta_0 / 2))$ por meio da Integral Elíptica Completa de 1ª Espécie $K(m)$, calculada via Média Aritmético-Geométrica (AGM) até a precisão de máquina ($< 10^{-15}$).
   - Comparação instantânea entre aproximação harmônica simples $T_0$, fórmula de correção de Borda e o período exato.

4. **Ondas Progressivas (Transversais, Longitudinais e Tanque 3D)**
   - Equação de onda fundamental $y(x,t) = A\sin(kx - \omega t + \phi)$ com $v = \lambda \cdot f$.
   - Modo transversal em corda contínua com atualização em buffer de vértices (0 alocações na GPU).
   - Modo longitudinal com oscilação periódica de camadas compressivas de partículas.
   - Tanque de ondas (Ripple Tank) com atenuação geométrica radial e superfícies com normais calculadas.

5. **Superposição e Interferência de Ondas**
   - Soma fasorial exata de dois centros emissores com atenuação radial: $A_{\text{res}} = \sqrt{a_1^2 + a_2^2 + 2a_1 a_2 \cos(\Delta\Phi)}$.
   - Validação da desigualdade envoltória $|y_{\text{res}}| \le A_{\text{res}}$.
   - Identificação física de regiões construtivas ($\Delta\Phi \equiv 0 \pmod{2\pi}$) e destrutivas ($\Delta\Phi \equiv \pi \pmod{2\pi}$).

6. **Ondas Estacionárias e Modos Normais**
   - Corda com ambas extremidades fixas: nós em $x = 0$ e $x = L$, $\lambda_n = \frac{2L}{n}$, $f_n = n \frac{v}{2L}$.
   - Tubo aberto em ambas extremidades: ventres em $x = 0$ e $x = L$.
   - Tubo fechado em uma ponta: nó em $x = 0$ e ventre em $x = L$. Exclusividade rigorosa de **harmônicos ímpares** ($n = 1, 3, 5, 7, \dots$), com $\lambda_n = \frac{4L}{n}$ e $f_n = n \frac{v}{4L}$.

7. **Acústica e Efeito Doppler Vetorial**
   - Formulação vetorial completa ao longo da linha de visada fonte-observador:
     $$f_{\text{obs}} = f_0 \left(\frac{v_{\text{som}} - \mathbf{u} \cdot \mathbf{v}_{\text{obs}}}{v_{\text{som}} - \mathbf{u} \cdot \mathbf{v}_{\text{fonte}}}\right)$$
   - Controle independente da velocidade da fonte e da velocidade do observador.
   - Transição subsônica e caracterização do cone de Mach ($\sin\mu = 1/M$) para regimes supersônicos ($M \ge 1$).
   - Síntese acústica em tempo real via Web Audio API (tons puros e fenômeno de batimentos).

8. **Fenômenos Ondulatórios (Reflexão, Refração e Difração)**
   - Inversão de fase na reflexão em extremidade fixa vs conservação de fase em extremidade livre.
   - Refração com conservação estrita da frequência ($f_1 = f_2$) e relação de comprimentos $\frac{\lambda_1}{\lambda_2} = \frac{v_1}{v_2}$.
   - Difração em fenda única com distribuição de intensidade $I(\theta) = I_0 \left(\frac{\sin\beta}{\beta}\right)^2$.

---

## 🚀 Instalação e Execução

### Pré-requisitos
- Node.js >= 18.0.0
- npm >= 9.0.0

### Instalação de Dependências
```bash
npm install
```

### Executar em Desenvolvimento
Inicia o servidor de desenvolvimento Vite na porta 3000:
```bash
npm run dev
```
Acesse `http://localhost:3000` no seu navegador.

### Bateria de Testes Físicos Automatizados
Executa a validação de invariantes matemáticos e físicos das simulações:
```bash
npm test
```

### Verificação de Tipos TypeScript
```bash
npm run lint
```

### Compilação de Produção
Gera o bundle otimizado na pasta `dist`:
```bash
npm run build
```

### Pré-visualização da Compilação
```bash
npm run preview
```

---

## 📊 Arquitetura de Software

```
src/
├── components/
│   ├── common/             # Controles de transporte, cabeçalho, KaTeX e gráficos
│   │   ├── AudioController.ts # Sintetizador Web Audio API com consentimento
│   │   ├── Header.tsx         # Barra superior técnica com 3 zonas
│   │   ├── KaTeXMath.tsx      # Renderizador tipográfico de fórmulas KaTeX
│   │   ├── PlaybackBar.tsx    # Controles universais de reprodução (Play, Pause, Step, 2D)
│   │   └── ScientificChart.tsx# Gráfico canvas de alta performance com scrubber e exportação CSV
│   ├── home/
│   │   └── HomePage.tsx       # Catálogo dos 8 módulos com atalhos de navegação
│   ├── modals/
│   │   ├── EnemBankModal.tsx  # Banco de questões ENEM com resoluções comentadas
│   │   ├── ExperimentModal.tsx# Laboratório guiado em 4 etapas (hipótese, teste, análise, conclusão)
│   │   ├── TeacherModeModal.tsx # Modo projetor para sala de aula com perguntas disparadoras
│   │   └── TestRunnerModal.tsx# Executador visual in-app dos 22 testes físicos
│   └── simulations/           # Cenas 3D interativas em Three.js
│       ├── SHM3D.tsx
│       ├── SpringMass3D.tsx
│       ├── Pendulum3D.tsx
│       ├── WaveProgressive3D.tsx
│       ├── Interference3D.tsx
│       ├── StandingWaves3D.tsx
│       ├── DopplerAcoustics3D.tsx
│       └── WavePhenomena3D.tsx
├── data/
│   ├── enemQuestions.ts      # Questões ENEM originais contextualizadas
│   ├── experiments.ts        # Roteiros investigativos orientados
│   └── modules.ts            # Metadados e ementa dos 8 módulos
├── physics/
│   ├── math.ts               # Motor de cálculo analítico e integradores numéricos
│   └── tests.ts              # Suite executável de 22 testes físicos
└── types/
    └── physics.ts            # Interfaces TypeScript rigorosas
```

---

## 🛡️ Otimizações de Desempenho e Compatibilidade

- **Zero Alocações na GPU por Frame:** Geometrias e materiais foram pré-alocados ou atualizados in-place através de atributos de buffer (`Float32Array`), eliminando travamentos de Garbage Collection em Chromebooks e computadores escolares.
- **Alternativa 2D Integrada:** Projeção ortogonal instantânea acionada pela barra de reprodução e suporte seguro a máquinas sem aceleração gráfica WebGL.
- **Persistência Local (LocalStorage):** Preserva o último módulo utilizado, respostas salvas dos experimentos e progresso dos simulados ENEM entre recarregamentos.
