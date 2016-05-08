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
    parenthesizedExpression
    | literal
    | dataLookup
    | helperApplication
    ;

literal returns [source]:
    INTEGER     #Integer
    | FLOAT     #Float
    | STRING    #String
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

blockElement :
    startBlock element* endBlock;

startBlock:
    START BLOCK ID expression* END;

endBlock:
    START BLOCK ID CLOSE_BLOCK END;

commentElement : START COMMENT END_COMMENT ;
