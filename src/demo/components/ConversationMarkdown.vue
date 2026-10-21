<template>
  <div class="pc-markdown">
    <template v-for="(block, index) in blocks">
      <pre
        v-if="block.type === 'code'"
        :key="index"
      ><code>{{ block.text }}</code></pre>
      <div
        v-else-if="block.type === 'table'"
        :key="index"
        class="pc-markdown-table-scroll"
      >
        <table>
          <thead>
            <tr>
              <th v-for="(cell, cellIndex) in block.headers" :key="cellIndex">
                <template v-for="(token, tokenIndex) in cell"
                  ><strong v-if="token.type === 'strong'" :key="tokenIndex">{{
                    token.text
                  }}</strong
                  ><code v-else-if="token.type === 'code'" :key="tokenIndex">{{
                    token.text
                  }}</code
                  ><a
                    v-else-if="token.type === 'link'"
                    :key="tokenIndex"
                    :href="token.href"
                    target="_blank"
                    rel="noopener noreferrer"
                    >{{ token.text }}</a
                  ><img
                    v-else-if="token.type === 'image'"
                    :key="tokenIndex"
                    :src="token.src"
                    :alt="token.alt"
                  /><span v-else :key="tokenIndex">{{
                    token.text
                  }}</span></template
                >
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, rowIndex) in block.rows" :key="rowIndex">
              <td v-for="(cell, cellIndex) in row" :key="cellIndex">
                <template v-for="(token, tokenIndex) in cell"
                  ><strong v-if="token.type === 'strong'" :key="tokenIndex">{{
                    token.text
                  }}</strong
                  ><code v-else-if="token.type === 'code'" :key="tokenIndex">{{
                    token.text
                  }}</code
                  ><a
                    v-else-if="token.type === 'link'"
                    :key="tokenIndex"
                    :href="token.href"
                    target="_blank"
                    rel="noopener noreferrer"
                    >{{ token.text }}</a
                  ><img
                    v-else-if="token.type === 'image'"
                    :key="tokenIndex"
                    :src="token.src"
                    :alt="token.alt"
                  /><span v-else :key="tokenIndex">{{
                    token.text
                  }}</span></template
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <component
        :is="`h${block.level + 2}`"
        v-else-if="block.type === 'heading'"
        :key="index"
        ><template v-for="(token, tokenIndex) in block.tokens"
          ><strong v-if="token.type === 'strong'" :key="tokenIndex">{{
            token.text
          }}</strong
          ><code v-else-if="token.type === 'code'" :key="tokenIndex">{{
            token.text
          }}</code
          ><a
            v-else-if="token.type === 'link'"
            :key="tokenIndex"
            :href="token.href"
            target="_blank"
            rel="noopener noreferrer"
            >{{ token.text }}</a
          ><img
            v-else-if="token.type === 'image'"
            :key="tokenIndex"
            :src="token.src"
            :alt="token.alt"
          /><span v-else :key="tokenIndex">{{ token.text }}</span></template
        ></component
      >
      <component
        :is="block.ordered ? 'ol' : 'ul'"
        v-else-if="block.type === 'list'"
        :key="index"
        ><li v-for="(item, itemIndex) in block.items" :key="itemIndex">
          <template v-for="(token, tokenIndex) in item"
            ><strong v-if="token.type === 'strong'" :key="tokenIndex">{{
              token.text
            }}</strong
            ><code v-else-if="token.type === 'code'" :key="tokenIndex">{{
              token.text
            }}</code
            ><a
              v-else-if="token.type === 'link'"
              :key="tokenIndex"
              :href="token.href"
              target="_blank"
              rel="noopener noreferrer"
              >{{ token.text }}</a
            ><img
              v-else-if="token.type === 'image'"
              :key="tokenIndex"
              :src="token.src"
              :alt="token.alt"
            /><span v-else :key="tokenIndex">{{ token.text }}</span></template
          >
        </li></component
      >
      <p v-else :key="index">
        <template v-for="(token, tokenIndex) in block.tokens"
          ><strong v-if="token.type === 'strong'" :key="tokenIndex">{{
            token.text
          }}</strong
          ><code v-else-if="token.type === 'code'" :key="tokenIndex">{{
            token.text
          }}</code
          ><a
            v-else-if="token.type === 'link'"
            :key="tokenIndex"
            :href="token.href"
            target="_blank"
            rel="noopener noreferrer"
            >{{ token.text }}</a
          ><img
            v-else-if="token.type === 'image'"
            :key="tokenIndex"
            :src="token.src"
            :alt="token.alt"
          /><span v-else :key="tokenIndex">{{ token.text }}</span></template
        >
      </p>
    </template>
  </div>
</template>

<script>
import { parseConversationMarkdown } from "../conversation-markdown";

export default {
  name: "ConversationMarkdown",
  props: { text: { type: String, default: "" } },
  computed: {
    blocks() {
      return parseConversationMarkdown(this.text);
    },
  },
};
</script>
