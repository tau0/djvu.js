#include "stdio.h"
#include "zp.h"
int main() {
    FILE * fin = fopen("input.txt", "r");
    FILE * fout = fopen("out.bin", "w");
    {
        ZPBitContext ctxs[10];
        char c = ' ';
        ZPEncoder zp(fout);
        printf("encoding..........\n");
        int q = 0;
        while ((c = fgetc(fin)) != EOF) {
            for (int i = 0; i < 8; ++i) {
                zp.encode((Bit) ((c >> i) & 1), ctxs[q++ % 10]);
            }
        }
        zp.close();
    }

    fclose(fin);
    fclose(fout);

    FILE * fans = fopen("answer.txt", "w");
    {
        printf("decoding..........\n");
        ZPBitContext ctxs1[10];
        char c = ' ';
        fout = fopen("input.txt", "r");
        fin = fopen("out.bin", "r");
        fseek(fout, 0L, SEEK_END);
        int sz = ftell(fout);
        fseek(fout, 0L, SEEK_SET);
        fseek(fin, 0L, SEEK_END);
        int sz1 = ftell(fin);
        fseek(fin, 0L, SEEK_SET);
        ZPDecoder zp1(fin, sz1);
        int qq = 0;
        for (int i = 0; i < sz; ++i) {
            char out = 0;
            for (int q = 0; q < 8; ++q) {
                out |= zp1.decode(ctxs1[qq++ % 10]) << q;
            }
            fprintf(fans, "%c", out);
        }
    }

    fclose(fans);
    fclose(fout);
    fclose(fin);

    return 0;
}
