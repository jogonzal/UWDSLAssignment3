grammar Regex;

options { language=JavaScript; }

regex : args+=concat ('|' args+=concat)* ;

concat : (args+=basic)+ ;

basic
    : star
    | plus
    | optional
    | atom
    ;

star : atom '*' ;

plus : atom '+' ;

optional : body=atom '?' ;

atom
    : group             # GroupRegex
    //| set               # SetRegex
    | '.'               # AnyRegex
    | START_OF_LINE     # StartRegex
    | END_OF_LINE       # EndRegex
    | CHAR+             # StringRegex
    ;

group : '(' (nocapture='?:')? regex ')' ;


ANY : '.' ;
START_OF_LINE : '^' ;
END_OF_LINE : '$' ;

CHAR : ~[()[\]{}\\^$|?*+.<>\-=!] | '\\' [()[\]{}\\^$|?*+.<>\-=!] ;
