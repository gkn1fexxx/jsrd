import { summary } from '../src/functions/summary.js'
import { readFile } from 'fs/promises';
import Life from '../src/life.js';

globalThis.json = async fileName => JSON.parse(await readFile(`data/${fileName}.json`));

globalThis.$$eventMap = new Map();
globalThis.$$event = (tag, data) => {
    const listener = $$eventMap.get(tag);
    if(listener) listener.forEach(fn=>fn(data));
}
globalThis.$$on = (tag, fn) => {
    let listener = $$eventMap.get(tag);
    if(!listener) {
        listener = new Set();
        $$eventMap.set(tag, listener);
    }
    listener.add(fn);
}
globalThis.$$off = (tag, fn) => {
    const listener = $$eventMap.get(tag);
    if(listener) listener.delete(fn);
}

class App {
    constructor() {
        this.#life = new Life();
    }

    Steps= {
        TALENT: 'talent',
        PROPERTY: 'property',
        TRAJECTORY: 'trajectory',
        SUMMARY: 'summary',
    };

    #step = this.Steps.SUMMARY;
    #life;
    #talentSelected = new Set();
    #talentExtend = new Set();
    #input;
    #auto;
    #isEnd;
    #propertyAllocation;
    #output;
    #exit;
    #interval;
    #style = {
        warn: ['\x1B[93m', '\x1B[39m'], // Bright Yellow
        grade1: ['\x1B[94m', '\x1B[39m'], // Bright Blue
        grade2: ['\x1B[95m', '\x1B[39m'], // Bright Magenta
        grade3: ['\x1B[93m', '\x1B[39m'], // Bright Yellow
        grade1b: ['\x1B[104m', '\x1B[49m'], // Bright Blue BG
        grade2b: ['\x1B[105m', '\x1B[49m'], // Bright Magenta BG
        grade3b: ['\x1B[103m', '\x1B[49m'], // Bright Yellow BG
    };
    #randomTalents;

    style(type, str) {
        const style = this.#style[type];
        if(!style) return str;
        return `${style[0]}${str}${style[1]}`;
    }

    async initial() {
        this.output('Now Loading...');
        this.#talentExtend = localStorage.talentExtend;
        await this.#life.initial();
        this.output(`\rLoading Complete.
My Life
\nšé®å„ \x1B[4m/remake\x1B[24m GOGOGO`,
            true
        );
        $$on('achievement', ({name})=>this.output(`
-------------------------
    č§£éęå°±ć${name}ć
-------------------------
`))
    }

    io(input, output, exit) {
        this.#input = input;
        this.#output = output;
        this.#exit = exit;
        input(command=>{
            const ret = this.repl(command);
            if(!ret) return;
            if(typeof ret == 'string') return this.output(ret, true);
            if(Array.isArray(ret)) return this.output(...ret);
            const { message, isRepl } = ret;
            return this.output(message, isRepl);
        });
    }

    output(data, isRepl) {
        if(!this.#output) return;
        this.#output(data, isRepl);
    }

    exit(code) {
        if(this.#exit) this.#exit(code);
        process.exit(code);
    }

    repl(command) {
        command = command.split(/\s+/);
        switch(command.shift()) {

            case 'r':
            case 'remake':
            case '/remake':return this.remake();

            case 's':
            case 'select':
            case '/select': return this.select(...command);

            case 'u':
            case 'unselect':
            case '/unselect': return this.unselect(...command);

            case 'n':
            case 'next':
            case '/next': return this.next(true);

            case 'a':
            case 'alloc':
            case 'allocation':
            case '/alloc':
            case '/allocation': return this.alloc(...command);

            case 'rd':
            case 'random':
            case '/random': return this.random();

            case 'at':
            case 'auto':
            case '/auto': return this.auto(...command);

            case 'x':
            case 'exit':
            case '/exit': return this.exit(0);

            case '?':
            case 'h':
            case 'help':
            case '/?':
            case '/h':
            case '/help':
            default: return this.help(...command);
        }
    }

    help(key) {

        switch(key) {
            case 'x':
            case 'exit':
            case '/exit': return `éåŗ
    x, exit, /exit      å½ä»¤åē­ęę`;

            case 'r':
            case 'remake':
            case '/remake': return `éå¼
    r, remake, /remake  å½ä»¤åē­ęę`;

            case 's':
            case 'select':
            case '/select': return `éę©
    s, select, /select  å½ä»¤åē­ęę

    Example:    /select 1 2 3 ęå³ēéę© 1 2 3 äøäøŖå¤©čµ

                /select <id1> [id2] [id3]

    åę°č§£é     <id1>   éåøøę„čÆ“č¦ęå®č³å°äøäøŖid
                        č½ē¶äøęå®ä¹åÆä»„
                [id2]
                [id3]   åÆä»„äøęå®`;

            case 'u':
            case 'unselect':
            case '/unselect': return `åę¶éę©
    u, unselect,
    /unselect           å½ä»¤åē­ęę

    Example:    /unselect 1 2 3
                ęå³ēåę¶éę© 1 2 3 äøäøŖå¤©čµ

    åę°č§£é     /unselect <id1> [id2] [id3]

                <id1>   éåøøę„čÆ“č¦ęå®č³å°äøäøŖid
                        č½ē¶äøęå®ä¹åÆä»„
                [id2]
                [id3]   åÆä»„äøęå®`;


            case 'a':
            case 'alloc':
            case 'allocation':
            case '/alloc':
            case '/allocation': return `åéå±ę§ē¹
    a, alloc, allocation
    /alloc, /allocation å½ä»¤åē­ęę

    Example:    /allocation STR 1
                /allocation INT -3
                /allocation CHR +5

    åę°č§£é    /allocation <TAG> <[+/-]value>

                <TAG>   č”Øē¤ŗč¦åéēå±ę§ę ē­¾
                        åÆéę
                            CHR, chr, c, C č”Øē¤ŗé¢å¼
                            INT, int, i, I č”Øē¤ŗęŗå
                            STR, str, s, S č”Øē¤ŗä½č“Ø
                            MNY, mny, m, M č”Øē¤ŗå®¶å¢
                        åæå”«

                <[+/-]value>
                        č”Øē¤ŗå±ę§ēč°ę“
                        å¶äø­
                            + č”Øē¤ŗåØå½ååŗē”äøå¢å 
                            - č”Øē¤ŗåØå½ååŗē”äøåå°
                            ę ē¬¦å·č”Øē¤ŗē“ę„č®¾ē½®äøŗę­¤å¼
                        åæå”«`;

            case 'n':
            case 'next':
            case '/next': return `ē»§ē»­
    n, next, /next      å½ä»¤åē­ęę

    ęę                éåøøēØäŗåę­„éŖ¤ē»ęå
                        ä¾å¦ļ¼  éę©å¤©čµå
                                åéå±ę§å
                                ęÆäøŖå¹“é¾äŗä»¶å
                                ę»čÆå
                                ē»§ęæå¤©čµå`;

            case 'at':
            case 'auto':
            case '/auto': return `čŖåØę­ę¾
    at, auto, /auto    å½ä»¤åē­ęę

    ęę                ēØäŗäŗŗēēčæēØäø­
                        ęÆäøŖå¹“é¾ä¼čŖåØäøäøå¹“
                        ę­ę¾éåŗ¦ 1 ē§ 1 å¹“`;

            case '?':
            case 'h':
            case 'help':
            case '/?':
            case '/h':
            case '/help': return `ę¾ē¤ŗåø®å©
    ļ¼, h, help
    /?, /h, /help           å½ä»¤åē­ęę

    Example:            /help
                        /help /select

    åę°č§£é             /help [command]

            [command]   č¦čÆ¦ē»ę¾ē¤ŗåø®å©ēå½ä»¤
                        åÆä»„äøå”«`;
        }
        return `Help ---
    å½ä»¤            čÆ“ę            ē¤ŗä¾
    x
    exit
    /exit           éåŗ            /exit

    r
    remake
    /remake         éå¼            /remake

    s
    select
    /select         éę©å¤©čµ        /select <id1> [id2] [id3]

    u
    unselect
    /unselect       åę¶éę©        /unselect <id1> [id2] [id3]

    a
    alloc
    allocation
    /alloc
    /allocation     åéå±ę§ē¹      /allocation <TAG> <[+/-]value>

    n
    next
    /next           ē»§ē»­            /next

    at
    auto
    /auto           čŖåØę­ę¾        /auto

    ?
    h
    help
    /?
    /h
    /help           ę¾ē¤ŗåø®å©        /help [command]`;
    }

    auto(arg) {
        this.#auto = arg != 'off';
        return this.next(true);
    }

    remake() {
        if(this.#talentExtend) {
            this.#life.talentExtend(this.#talentExtend)
            dumpLocalStorage();
            this.#talentExtend = null;
        }

        this.#isEnd = false;
        this.#talentSelected.clear();
        this.#propertyAllocation = {CHR:0,INT:0,STR:0,MNY:0,SPR:5};
        this.#step = this.Steps.TALENT;
        this.#randomTalents = this.#life.talentRandom();
        return this.list();
    }

    select(...select) {
        switch(this.#step) {
            case this.Steps.TALENT: return this.talentSelect(...select);
            case this.Steps.SUMMARY: return this.talentExtend(...select);
        }
    }

    unselect(...select) {
        switch(this.#step) {
            case this.Steps.TALENT: return this.talentUnSelect(...select);
            case this.Steps.SUMMARY: return this.talentExtendCancle(...select);
        }
    }

    talentSelect(...select) {
        const warn = str => `${this.list()}\n${this.style('warn', str)}`;
        for(const number of select) {
            const s = this.#randomTalents[number];
            if(!s) return warn(`${number} äøŗęŖē„å¤©čµ`);
            if(this.#talentSelected.has(s)) continue;
            if(this.#talentSelected.size == 3)
                return warn('ā åŖč½é3äøŖå¤©čµ');

            const exclusive = this.#life.exclusive(
                Array.from(this.#talentSelected).map(({id})=>id),
                s.id
            );

            if(exclusive != null)
                for(const { name, id } of this.#talentSelected)
                    if(id == exclusive)
                        return warn(`å¤©čµć${s.name}ćäøå·²éę©ēå¤©čµć${name}ćå²ēŖ`);

            this.#talentSelected.add(s);
        }

        return this.list();
    }

    talentUnSelect(...select) {
        for(const number of select) {
            const s = this.#randomTalents[number];
            if(this.#talentSelected.has(s))
                this.#talentSelected.delete(s);
        }

        return this.list();
    }

    talentExtend(select) {
        const warn = str => `${this.list()}\n${this.style('warn', str)}`;
        const list = Array.from(this.#talentSelected);
        const s = list[select];
        if(!s) return warn(`${select} äøŗęŖē„å¤©čµ`);
        this.#talentExtend = s.id;
        return this.list();
    }

    talentExtendCancle() {
        this.#talentExtend = null;
    }

    list() {
        let description, list, check;
        switch(this.#step) {
            case this.Steps.TALENT:
                description = 'š čÆ·éę©3äøŖå¤©čµ';
                list = this.#randomTalents;
                check = talent=>this.#talentSelected.has(talent);
                break;
            case this.Steps.SUMMARY:
                description = 'š ä½ åÆä»„éäøäøŖå¤©čµē»§ęæ';
                list = Array.from(this.#talentSelected);
                check = ({id})=>this.#talentExtend == id;
                break;
        }
        if(!list) return '';

        return [description, list.map(
                (talent, i) =>
                    this.style(
                        `grade${talent.grade}b`,
                        `${check(talent)?'ā':' '} ${i} ${talent.name}ļ¼${talent.description}ļ¼`
                    )
            )]
            .flat()
            .join('\n');
    }

    next(enter) {
        const warn = (a, b) => `${a}\n${this.style('warn', this.style('warn', b))}`;
        switch(this.#step) {
            case this.Steps.TALENT:
                if(this.#talentSelected.size != 3) return warn(this.list(), `ā čÆ·éę©3äøŖå¤©čµ`);
                this.#step = this.Steps.PROPERTY;
                this.#propertyAllocation.total = 20 + this.#life.getTalentAllocationAddition(
                    Array.from(this.#talentSelected).map(({id})=>id)
                );
                this.#propertyAllocation.TLT = Array.from(this.#talentSelected).map(({id})=>id);
                return this.prop();
            case this.Steps.PROPERTY:
                const less = this.less();
                if(less > 0) return warn(this.prop(), `ä½ čæę${less}å±ę§ē¹ę²”ęåéå®`);
                this.#step = this.Steps.TRAJECTORY;
                delete this.#propertyAllocation.total;
                this.#life.restart(this.#propertyAllocation);
                return this.trajectory(enter);
            case this.Steps.TRAJECTORY:
                if(!this.#isEnd) return this.trajectory(enter);
                this.#step = this.Steps.SUMMARY;
                return `${
                    this.summary()
                }\n\n${
                    this.list()
                }`;
            case this.Steps.SUMMARY:
                return this.remake();
        }
    }

    trajectory(enter) {
        if(enter) {
            if(this.#interval) {
                clearInterval(this.#interval);
                this.#interval = null;
                this.#auto = false;
            } else if(this.#auto) {
                this.#interval = setInterval(
                    ()=>{
                        const trajectory = this.next();
                        if(this.#isEnd && this.#interval) {
                            clearInterval(this.#interval);
                            this.#interval = null;
                        }
                        if(!this.#isEnd) return this.output(`${trajectory}\n`);
                        return this.output(trajectory, true);
                    }
                , 1000);
                return;
            }
        }

        const trajectory = this.#life.next();
        const { age, content, isEnd } = trajectory;
        if(isEnd) this.#isEnd = true;
        return `${age}å²ļ¼\t${
            content.map(
                ({type, description, grade, name, postEvent}) => {
                    switch(type) {
                        case 'TLT':
                            return `å¤©čµć${name}ćååØļ¼${description}`;
                        case 'EVT':
                            return description + (postEvent?`\n\t${postEvent}`:'');
                    }
                }
            ).join('\n\t')
        }`;
    }

    prop() {
        const { CHR, INT, STR, MNY } = this.#propertyAllocation;
        return `šå±ę§åé
å©ä½ē¹ę° ${this.less()}

å±ę§(TAG)       å½åå¼
é¢å¼(CHR)         ${CHR}
ęŗå(INT)         ${INT}
ä½č“Ø(STR)         ${STR}
å®¶å¢(MNY)         ${MNY}
        `
    }

    less() {
        const { total, CHR, INT, STR, MNY } = this.#propertyAllocation;
        return total - CHR - INT - STR - MNY;
    }

    alloc(tag, value) {
        const warn = str => `${this.prop()}\n${this.style('warn', str)}`
        if(!value) return warn('ā  åéēę°å¼ę²”ęē»å®');
        const isSet = !(value[0] == '-'|| value[0] == '+');

        value = Number(value);
        if(isNaN(value)) return warn('ā  åéēę°å¼äøę­£ē”®');

        switch(tag) {
            case 'c':
            case 'chr':
            case 'C': tag = 'CHR'; break;
            case 'i':
            case 'int':
            case 'I': tag = 'INT'; break;
            case 's':
            case 'S':
            case 'str': tag = 'STR'; break;
            case 'm':
            case 'M':
            case 'mny': tag = 'MNY'; break;
        }


        switch(tag) {
            case 'CHR':
            case 'INT':
            case 'STR':
            case 'MNY':
                if(isSet) value = value - this.#propertyAllocation[tag];

                const tempLess = this.less() - value;
                const tempSet = this.#propertyAllocation[tag] + value;

                if(tempLess<0) return  warn('ā  ä½ ę²”ęę“å¤ēē¹ę°åÆä»„åéäŗ');
                if(
                    tempLess>this.#propertyAllocation.total
                    || tempSet < 0
                ) return  warn('ā  äøč½åéč“ę°å±ę§');
                if(tempSet>10) return  warn('ā  åé”¹å±ę§ęé«åé10ē¹');

                this.#propertyAllocation[tag] += value;

                return this.prop();

            default:
                return  warn('ā  ęŖē„ētag');
        }
    }

    random() {
        let t = this.#propertyAllocation.total;
        const arr = [10, 10, 10, 10];
        while(t>0) {
            const sub = Math.round(Math.random() * (Math.min(t, 10) - 1)) + 1;
            while(true) {
                const select = Math.floor(Math.random() * 4) % 4;
                if(arr[select] - sub <0) continue;
                arr[select] -= sub;
                t -= sub;
                break;
            }
        }
        this.#propertyAllocation.CHR = 10 - arr[0];
        this.#propertyAllocation.INT = 10 - arr[1];
        this.#propertyAllocation.STR = 10 - arr[2];
        this.#propertyAllocation.MNY = 10 - arr[3];
        return this.prop();
    }

    summary() {
        const summaryData = this.#life.getSummary();
        const format = (name, type) => {
            const value = summaryData[type];
            const { judge, grade } = summary(type, value);
            return this.style(`grade${grade}b`, `${name}ļ¼${value} ${judge}`);
        }

        return [
            'š ę»čÆ',
            format('é¢å¼', 'CHR'),
            format('ęŗå', 'INT'),
            format('ä½č“Ø', 'STR'),
            format('å®¶å¢', 'MNY'),
            format('åæ«ä¹', 'SPR'),
            format('äŗ«å¹“', 'AGE'),
            format('ę»čÆ', 'SUM'),
        ].join('\n');
    }
}

export default App;