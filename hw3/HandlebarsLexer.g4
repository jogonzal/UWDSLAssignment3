lexer grammar HandlebarsLexer;

options { language=JavaScript; }

// Default mode: everything outside of a construct
TEXT : ~[{]+ ;
BRACE : '{' ;
START : '{{' -> mode(Island) ;

mode Island;

BLOCK : '#' ;
CLOSE_BLOCK : '/';
ID : [a-zA-Z_] [a-zA-Z0-9_]* ;
COMMENT : '!--'  -> mode(Comment);
WS : [ \t\n\r]+ -> channel(HIDDEN) ;
END : '}}' -> mode(DEFAULT_MODE) ;
OPEN_PAREN : '(' ;
CLOSE_PAREN : ')' ;

FLOAT
    :   '-'? INT '.' INT EXP?   // 1.35, 1.35E-9, 0.3, -4.5
    |   '-'? INT EXP            // 1e10 -3e4
    |   '-'? INT                // -3, 45
    ;
fragment INT :   '0' | [1-9] [0-9]* ; // no leading zeros
fragment EXP :   [Ee] [+\-]? INT ;

INTEGER : '-'? [0-9]+ ;

STRING :  '\'' (ESC | ~['\\])* '\'' ;
fragment ESC :   '\\' (['\\/bfnrt] | UNICODE) ;
fragment UNICODE : 'u' HEX HEX HEX HEX ;
fragment HEX : [0-9a-fA-F] ;

mode Comment ;

ANY : .+? -> channel(HIDDEN) ;
END_COMMENT : '--}}' -> mode(DEFAULT_MODE) ;
