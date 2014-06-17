#include "stdio.h"
#include "zp.h"
int main() {
    ZPNumContext ctx(-1256, 1256);
    FILE * fin = fopen("input.txt", "r");
    FILE * fout = fopen("out.bin", "w");
    char c = ' ';
    ZPEncoder zp(fout);
    while ((c = fgetc(fin)) != EOF) {
        printf("%d ", c);
        zp.encode(c, ctx);
    }
    fclose(fin);
    fclose(fout);


    printf("decoding..........\n");
    ZPNumContext ctx1(-1256, 1256);
    fout = fopen("input.txt", "r");
    fin = fopen("out.bin", "r");
    FILE * fans = fopen("answer.txt", "w");
    c = ' ';
    fseek(fout, 0L, SEEK_END);
    int sz = ftell(fout);
    fseek(fout, 0L, SEEK_SET);
    ZPDecoder zp1(fin, sz);
    char ans[1000];
    int j = 0;
    for (int i = 0; i < sz; ++i) {
        fprintf(fans, "%c", zp1.decode(ctx1));
    }
    fclose(fans);
    fclose(fin);

    return 0;
}
