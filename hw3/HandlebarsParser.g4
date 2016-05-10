parser grammar HandlebarsParser;

options { language=JavaScript; tokenVocab=HandlebarsLexer; }

document : element* EOF ;

element
    : rawElement
    | expressionElement
    | blockElement
    | commentElement
    ;

rawElement
    : TEXT
    | BRACE TEXT;

expression returns [source] :
    helperApplication
    | parenthesizedExpression
    | literal
    | dataLookup
    ;

literal returns [source]:
    INTEGER
    | FLOAT
    | STRING
    ;

parenthesizedExpression returns [source]:
    OPEN_PAREN exp=expression CLOSE_PAREN;

// TODO
helperApplication returns [source]:
    funcName=ID (args+=expression)+
    ;

dataLookup returns [source]:
    variableName=ID
    ;

expressionElement:
    START exp=expression END
    ;

blockElement returns [source]:
    start=blockStart body=blockBody end=blockEnd;

blockStart returns [source]:
    START BLOCK identifier=ID (args+=expression)* END;

blockEnd returns [source]:
    START CLOSE_BLOCK identifier=ID CLOSE_BLOCK END;

blockBody returns [source]:
    element*
    ;

commentElement : START COMMENT END_COMMENT ;
